const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For 1:1 chat
    groupId: { type: String }, // For group chats (e.g., 'finance-gd')
    announcementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' }, // For announcement replies (if allowed) or broadcasts
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'video_link'], default: 'text' },
    read: { type: Boolean, default: false },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
