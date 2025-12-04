import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { UserModel } from "../modules/users/user.model.js";

let io = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
    });

    // Log khi socket.io được khởi tạo
    if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Socket.io initialized');
    }

    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await UserModel.findById(decoded.userId).select("_id name email role isActive");

            if (!user || !user.isActive) {
                return next(new Error("Authentication error: User not found or inactive"));
            }

            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (error) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        // Join user's personal room
        socket.join(`user:${socket.userId}`);
    });

    return io;
}

/**
 * Get Socket.io instance
 */
export function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized. Call initializeSocket first.");
    }
    return io;
}

/**
 * Emit notification to a specific user
 */
export function emitNotification(userId, notification) {
    const socketIO = getIO();
    socketIO.to(`user:${userId}`).emit("notification", notification);
}

/**
 * Emit notification to multiple users
 */
export function emitNotificationToUsers(userIds, notification) {
    const socketIO = getIO();
    userIds.forEach((userId) => {
        socketIO.to(`user:${userId}`).emit("notification", notification);
    });
}

/**
 * Emit attendance update event to a specific user
 */
export function emitAttendanceUpdate(userId, attendanceData) {
    const socketIO = getIO();
    socketIO.to(`user:${userId}`).emit("attendance-updated", attendanceData);
}

/**
 * Emit attendance update to all admins/managers (for dashboard updates)
 */
export function emitAttendanceUpdateToAdmins(attendanceData) {
    const socketIO = getIO();
    // Emit to a room for admins/managers (can be enhanced with role-based rooms)
    socketIO.to("admins").emit("attendance-updated", attendanceData);
}

/**
 * Emit payroll update event to a specific user
 */
export function emitPayrollUpdate(userId, payrollData) {
    const socketIO = getIO();
    socketIO.to(`user:${userId}`).emit("payroll-updated", payrollData);
}

/**
 * Emit data update event (generic for any entity type)
 */
export function emitDataUpdate(userId, entityType, data) {
    const socketIO = getIO();
    socketIO.to(`user:${userId}`).emit("data-updated", {
        entityType,
        data,
    });
}

