const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    linkCode: { type: String, unique: true },
    fileUrl: { type: String },
    fileType: { type: String }, // 'image' or 'document'
    fileName: { type: String },
    poll: {
        question: { type: String },
        options: [{
            text: { type: String },
            votes: { type: Number, default: 0 }
        }],
        userVotes: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            optionIndex: { type: Number }
        }]
    },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'AnnouncementGroup' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);
