import app from "./app.js";
import { connectDB } from "./config/db.js";
import { Server } from "socket.io";
import { canChatWithEachOther } from "./utils/chatValidation.js";
import { initCronJobs } from "./cron/evaluatorCron.js";

// DATABASE CONNECTION
connectDB();

// START SERVER
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    initCronJobs(); // Initialize cron jobs
});

// INITIALIZE SOCKET.IO
const io = new Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL, 
            ...(process.env.FRONTEND_URLS || "").split(",").map(v => v.trim()).filter(Boolean),
            "http://localhost:5173" // Default Vite port fallback
        ],
        methods: ["GET", "POST"]
    }
});

// Map of online users: userId -> socketId
global.onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User logs in and connects to socket
    socket.on("add-user", (userId) => {
        onlineUsers.set(userId, socket.id);
        
        // Broadcast to all that this user is online
        io.emit("user-online", { userId });
        
        // Send the list of all currently online users to the newly connected user
        const onlineUsersList = Array.from(onlineUsers.keys());
        socket.emit("get-online-users", onlineUsersList);
    });

    // Send Message Event
    socket.on("send-msg", async (data) => {
        const { sender, receiver, content, isGroup, projectId } = data;
        
        try {
            if (isGroup) {
                // Find all members of the project to broadcast
                const { Project } = await import('./models/project.js');
                const project = await Project.findById(projectId);
                if (!project) return;
                
                // Collect all member IDs (including supervisor)
                const groupMembers = [...project.members.map(m => m.toString())];
                if (project.supervisor) groupMembers.push(project.supervisor.toString());

                // Broadcast to all online group members except the sender
                groupMembers.forEach(memberId => {
                    if (memberId !== sender.toString()) {
                        const memberSocketId = onlineUsers.get(memberId);
                        if (memberSocketId) {
                            socket.to(memberSocketId).emit("msg-receive", {
                                sender,
                                content,
                                projectId,
                                isGroup: true,
                                createdAt: new Date()
                            });
                        }
                    }
                });
            } else {
                // Validation: Can they chat?
                const isAllowed = await canChatWithEachOther(sender, receiver);
                if (!isAllowed) {
                    socket.emit("msg-error", { message: "You don't have permission to message this user." });
                    return;
                }

                const receiverSocketId = onlineUsers.get(receiver);
                if (receiverSocketId) {
                    socket.to(receiverSocketId).emit("msg-receive", { 
                        sender, 
                        content, 
                        isGroup: false,
                        createdAt: new Date() 
                    });
                }
            }
        } catch (error) {
            console.error("Socket error on send-msg:", error);
        }
    });

    // Typing Event
    socket.on("typing", async (data) => {
        const { sender, receiver, isGroup, projectId } = data;
        
        if (isGroup) {
            const { Project } = await import('./models/project.js');
            const project = await Project.findById(projectId);
            if (!project) return;
            const groupMembers = [...project.members.map(m => m.toString())];
            if (project.supervisor) groupMembers.push(project.supervisor.toString());

            groupMembers.forEach(memberId => {
                if (memberId !== sender.toString()) {
                    const memberSocketId = onlineUsers.get(memberId);
                    if (memberSocketId) {
                        socket.to(memberSocketId).emit("typing-receive", { sender, isGroup: true, projectId });
                    }
                }
            });
        } else {
            const receiverSocketId = onlineUsers.get(receiver);
            if (receiverSocketId) {
                socket.to(receiverSocketId).emit("typing-receive", { sender, isGroup: false });
            }
        }
    });

    // Stop Typing Event
    socket.on("stop-typing", async (data) => {
        const { sender, receiver, isGroup, projectId } = data;
        if (isGroup) {
            const { Project } = await import('./models/project.js');
            const project = await Project.findById(projectId);
            if (!project) return;
            const groupMembers = [...project.members.map(m => m.toString())];
            if (project.supervisor) groupMembers.push(project.supervisor.toString());

            groupMembers.forEach(memberId => {
                if (memberId !== sender.toString()) {
                    const memberSocketId = onlineUsers.get(memberId);
                    if (memberSocketId) {
                        socket.to(memberSocketId).emit("stop-typing-receive", { sender, isGroup: true, projectId });
                    }
                }
            });
        } else {
            const receiverSocketId = onlineUsers.get(receiver);
            if (receiverSocketId) {
                socket.to(receiverSocketId).emit("stop-typing-receive", { sender, isGroup: false });
            }
        }
    });

    // Check status manually
    socket.on("check-online-status", (userId) => {
        const isOnline = onlineUsers.has(userId);
        socket.emit("online-status-response", { userId, isOnline });
    });

    // Unsend Message Event
    socket.on("unsend-msg", async (data) => {
        const { messageId, isGroup, projectId, sender, receiver } = data;
        
        if (isGroup) {
            const { Project } = await import('./models/project.js');
            const project = await Project.findById(projectId);
            if (!project) return;
            const groupMembers = [...project.members.map(m => m.toString())];
            if (project.supervisor) groupMembers.push(project.supervisor.toString());

            groupMembers.forEach(memberId => {
                if (memberId !== sender.toString()) {
                    const memberSocketId = onlineUsers.get(memberId);
                    if (memberSocketId) {
                        socket.to(memberSocketId).emit("msg-unsent", { messageId, projectId, isGroup: true });
                    }
                }
            });
        } else {
            const receiverSocketId = onlineUsers.get(receiver);
            if (receiverSocketId) {
                socket.to(receiverSocketId).emit("msg-unsent", { messageId, isGroup: false, sender });
            }
        }
    });

    // React Message Event
    socket.on("react-msg", async (data) => {
        const { messageId, isGroup, projectId, sender, receiver, reactions } = data;
        
        if (isGroup) {
            const { Project } = await import('./models/project.js');
            const project = await Project.findById(projectId);
            if (!project) return;
            const groupMembers = [...project.members.map(m => m.toString())];
            if (project.supervisor) groupMembers.push(project.supervisor.toString());

            groupMembers.forEach(memberId => {
                if (memberId !== sender.toString()) {
                    const memberSocketId = onlineUsers.get(memberId);
                    if (memberSocketId) {
                        socket.to(memberSocketId).emit("msg-reaction", { messageId, projectId, isGroup: true, reactions });
                    }
                }
            });
        } else {
            const receiverSocketId = onlineUsers.get(receiver);
            if (receiverSocketId) {
                socket.to(receiverSocketId).emit("msg-reaction", { messageId, isGroup: false, reactions });
            }
        }
    });

    socket.on("disconnect", () => {
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                // Broadcast that this user went offline
                io.emit("user-offline", { userId });
                break;
            }
        }
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

// ERROR HANDLING
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection at: ${err.message}`);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception at: ${err.message}`);
    process.exit(1);
});

export default server;
