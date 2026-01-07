const mongoose = require('mongoose');

const gdStatusSchema = new mongoose.Schema({
    isActive: { type: Boolean, default: false },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0 }
});

// We only need one document for the global status
module.exports = mongoose.model('GDStatus', gdStatusSchema);
