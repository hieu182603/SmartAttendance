import { ProjectModel } from "./project.model.js";
import logger from "../../config/logger.js";

const getUserId = (req) => req.user?.userId || req.user?.id || req.user?._id;

// List projects for the manager's company (Manager+)
export const getProjects = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }

    const projects = await ProjectModel.find({ companyId }).sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    logger.error(`[project.getProjects] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new project (Manager+)
export const createProject = async (req, res) => {
  try {
    const { name, code, description, status, members } = req.body;
    const companyId = req.user?.companyId;
    const createdBy = getUserId(req);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }
    if (!name || !code) {
      return res.status(400).json({ success: false, message: "Name and code are required" });
    }

    const project = new ProjectModel({
      name,
      code,
      description: description || "",
      status: status === "paused" ? "paused" : "active",
      members: Array.isArray(members) ? members : [],
      companyId,
      createdBy,
    });

    await project.save();
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    logger.error(`[project.createProject] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a project (Manager+, same company)
export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = String(req.user?.companyId || "");
    const { name, code, description, status, members } = req.body;

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (String(project.companyId) !== companyId) {
      return res.status(403).json({ success: false, message: "Project not found in your company" });
    }

    if (name !== undefined) project.name = name;
    if (code !== undefined) project.code = code;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status === "paused" ? "paused" : "active";
    if (members !== undefined) project.members = Array.isArray(members) ? members : [];

    await project.save();
    res.json({ success: true, data: project });
  } catch (error) {
    logger.error(`[project.updateProject] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a project (Manager+, same company)
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = String(req.user?.companyId || "");

    const project = await ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (String(project.companyId) !== companyId) {
      return res.status(403).json({ success: false, message: "Project not found in your company" });
    }

    await project.deleteOne();
    res.json({ success: true, data: { _id: projectId } });
  } catch (error) {
    logger.error(`[project.deleteProject] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
