import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    isGroup: { type: Boolean, default: false },
    content: { type: String, required: true },
    fileUrl: { type: String, default: null },
    fileType: { type: String, default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String }
    }],
    isUnsent: { type: Boolean, default: false },
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
