import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "./user.model.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

export const authRouter = Router();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1)
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

authRouter.post("/register", async (req, res) => {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });
    const { email, password, name } = parse.data;

    const existed = await UserModel.findOne({ email });
    if (existed) return res.status(409).json({ message: "Email already registered" });

    // Model sẽ tự hash password trong pre('save') hook
    const user = await UserModel.create({ email, password, name });
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });
    
    return res.status(201).json({ 
        token,
        user: { id: user._id, email: user.email, name: user.name } 
    });
});

authRouter.post("/login", async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });
    const { email, password } = parse.data;

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    
    // Sử dụng method comparePassword từ model
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });
    return res.json({ 
        token,
        user: { id: user._id, email: user.email, name: user.name } 
    });
});

// Get current user profile
authRouter.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});


