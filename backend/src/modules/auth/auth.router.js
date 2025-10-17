import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "./user.model.js";

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

    const hash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ email, password: hash, name });
    return res.status(201).json({ id: user._id, email: user.email, name: user.name });
});

authRouter.post("/login", async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ errors: parse.error.flatten() });
    const { email, password } = parse.data;

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ sub: user._id, email: user.email }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });
    return res.json({ token });
});


