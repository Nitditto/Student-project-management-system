import { canChatWithEachOther } from '../utils/chatValidation.js';
import { Message } from '../models/message.js';
import { Project } from '../models/project.js';
import { User } from '../models/user.js';
import ErrorHandler from '../middleware/error.js';
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

export const getChatHistory = async (req, res, next) => {
    try {
        const { user1Id, user2Id } = req.params;
        const isGroup = req.query.isGroup === 'true';

        let messages;
        if (isGroup) {
            // Check if user1Id is a member of the project (user2Id is projectId)
            const project = await Project.findOne({ _id: user2Id, $or: [{ members: user1Id }, { supervisor: user1Id }] });
            if (!project) return next(new ErrorHandler("Không có quyền truy cập nhóm chat này.", 403));

            messages = await Message.find({ 
                projectId: user2Id, 
                isGroup: true,
                deletedBy: { $ne: user1Id } 
            }).sort({ createdAt: 1 })
              .populate('sender', 'name')
              .populate({ path: 'replyTo', select: 'content sender isUnsent fileType', populate: { path: 'sender', select: 'name' }});
        } else {
            const isAllowed = await canChatWithEachOther(user1Id, user2Id);
            if (!isAllowed) {
                return next(new ErrorHandler("Không có quyền truy cập đoạn chat này.", 403));
            }

            messages = await Message.find({
                isGroup: false,
                deletedBy: { $ne: user1Id },
                $or: [
                    { sender: user1Id, receiver: user2Id },
                    { sender: user2Id, receiver: user1Id }
                ]
            }).sort({ createdAt: 1 })
              .populate('sender', 'name')
              .populate({ path: 'replyTo', select: 'content sender isUnsent fileType', populate: { path: 'sender', select: 'name' }});
        }

        // Mark as read
        const unreadMessageIds = messages
            .filter(m => m.sender._id.toString() !== user1Id.toString() && !m.readBy.includes(user1Id))
            .map(m => m._id);
            
        if (unreadMessageIds.length > 0) {
            await Message.updateMany(
                { _id: { $in: unreadMessageIds } },
                { $addToSet: { readBy: user1Id } }
            );
        }

        res.status(200).json({
            success: true,
            messages
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};



export const saveMessage = async (req, res, next) => {
    try {
        const { sender, receiver, content, isGroup, projectId, replyTo } = req.body;
        let fileUrl = null;
        let fileType = null;

        if (req.files && req.files.file) {
            const file = req.files.file;
            const ext = path.extname(file.name);
            const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
            const uploadPath = path.join(uploadsDir, filename);
            
            await file.mv(uploadPath);
            fileUrl = `/uploads/${filename}`;
            fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
        }

        let newMessage;
        if (isGroup === 'true' || isGroup === true) {
            // Validate group permission
            const project = await Project.findOne({ _id: projectId, $or: [{ members: sender }, { supervisor: sender }] });
            if (!project) return next(new ErrorHandler("Không có quyền chat trong nhóm này.", 403));
            newMessage = await Message.create({ sender, projectId, content: content || 'Đã gửi một tệp đính kèm', fileUrl, fileType, isGroup: true, replyTo: replyTo || null });
        } else {
            const isAllowed = await canChatWithEachOther(sender, receiver);
            if (!isAllowed) {
                return next(new ErrorHandler("Không có quyền nhắn tin cho người này.", 403));
            }
            newMessage = await Message.create({ sender, receiver, content: content || 'Đã gửi một tệp đính kèm', fileUrl, fileType, isGroup: false, replyTo: replyTo || null });
        }

        // Populate replyTo for returning
        newMessage = await newMessage.populate({ path: 'replyTo', select: 'content sender isUnsent fileType', populate: { path: 'sender', select: 'name' } });

        res.status(201).json({
            success: true,
            message: newMessage
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

export const getChatPartners = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        let partners = [];

        if (user.role === 'Student') {
            const projects = await Project.find({ members: userId }).populate('supervisor', 'name email avatar role').populate('members', 'name email avatar role');
            projects.forEach(p => {
                if (p.supervisor) partners.push({ ...p.supervisor.toObject(), isGroup: false });
                
                // Add fellow members for 1-1 chat
                p.members.forEach(m => {
                    if (m._id.toString() !== userId.toString()) {
                        partners.push({ ...m.toObject(), isGroup: false });
                    }
                });

                // Add group chat
                partners.push({ 
                    _id: p._id, 
                    name: `${p.title} (Group)`, 
                    email: `${p.members.length} members`, 
                    isGroup: true,
                    members: p.members.map(m => m.toObject()).concat(p.supervisor ? [p.supervisor.toObject()] : [])
                });
            });
        } else if (user.role === 'Teacher') {
            const projects = await Project.find({ supervisor: userId }).populate('members', 'name email avatar role').populate('supervisor', 'name email avatar role');
            projects.forEach(p => {
                if (p.members && p.members.length > 0) {
                    p.members.forEach(m => partners.push({ ...m.toObject(), isGroup: false }));
                }
                partners.push({ 
                    _id: p._id, 
                    name: `${p.title} (Group)`, 
                    email: `${p.members.length} members`, 
                    isGroup: true,
                    members: p.members.map(m => m.toObject()).concat(p.supervisor ? [p.supervisor.toObject()] : [])
                });
            });
        }

        // Remove duplicates and calculate unread count for each partner
        const uniquePartnersMap = new Map();
        partners.forEach(p => {
            if (p && p._id && !uniquePartnersMap.has(p._id.toString())) {
                uniquePartnersMap.set(p._id.toString(), { ...p, unreadCount: 0 });
            }
        });
        
        const finalPartners = Array.from(uniquePartnersMap.values());

        // Calculate unread counts and latest message
        for (let partner of finalPartners) {
            let unreadCount = 0;
            let latestMessage = null;

            if (partner.isGroup) {
                unreadCount = await Message.countDocuments({
                    projectId: partner._id,
                    isGroup: true,
                    sender: { $ne: userId },
                    readBy: { $ne: userId }
                });
                latestMessage = await Message.findOne({
                    projectId: partner._id,
                    isGroup: true
                }).sort({ createdAt: -1 });
            } else {
                unreadCount = await Message.countDocuments({
                    sender: partner._id,
                    receiver: userId,
                    isGroup: false,
                    readBy: { $ne: userId }
                });
                latestMessage = await Message.findOne({
                    isGroup: false,
                    $or: [
                        { sender: userId, receiver: partner._id },
                        { sender: partner._id, receiver: userId }
                    ]
                }).sort({ createdAt: -1 });
            }
            partner.unreadCount = unreadCount;
            partner.latestMessageAt = latestMessage ? latestMessage.createdAt : new Date(0);
        }

        // Sort partners by latest message (descending)
        finalPartners.sort((a, b) => new Date(b.latestMessageAt) - new Date(a.latestMessageAt));

        res.status(200).json({
            success: true,
            partners: finalPartners
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

export const unsendMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return next(new ErrorHandler("Không tìm thấy tin nhắn.", 404));
        
        if (message.sender.toString() !== userId.toString()) {
            return next(new ErrorHandler("Chỉ người gửi mới có thể thu hồi tin nhắn.", 403));
        }

        message.isUnsent = true;
        await message.save();

        res.status(200).json({ success: true, message: "Thu hồi tin nhắn thành công." });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

export const deleteMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return next(new ErrorHandler("Không tìm thấy tin nhắn.", 404));

        if (!message.deletedBy.includes(userId)) {
            message.deletedBy.push(userId);
            await message.save();
        }

        res.status(200).json({ success: true, message: "Đã xóa tin nhắn khỏi phía bạn." });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

export const reactMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return next(new ErrorHandler("Không tìm thấy tin nhắn.", 404));

        const existingReactionIndex = message.reactions.findIndex(r => r.user.toString() === userId.toString());
        
        if (existingReactionIndex >= 0) {
            // Toggle logic
            if (message.reactions[existingReactionIndex].emoji === emoji) {
                message.reactions.splice(existingReactionIndex, 1); // remove if same emoji
            } else {
                message.reactions[existingReactionIndex].emoji = emoji; // update if different
            }
        } else {
            message.reactions.push({ user: userId, emoji });
        }

        await message.save();

        res.status(200).json({ success: true, reactions: message.reactions });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

