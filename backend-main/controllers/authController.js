const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Error", error: err.message });
  }
};

const getGDMessages = async (req, res) => {
  try {
    const Message = require('../models/message');
    const messages = await Message.find({ groupId: 'finance-gd' })
      .sort({ createdAt: 1 })
      .populate('sender', 'name profilePic role');
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "supersecretjwtkey", { expiresIn: "1h" });

    res.json({ token, userId: user._id, role: user.role, name: user.name, email: user.email, profilePic: user.profilePic });


  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Error" });
  }
};

const getPrivateMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const Message = require('../models/message');
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const votePoll = async (req, res) => {
  const { announcementId, userId } = req.body;
  const optionIndex = Number(req.body.optionIndex);
  try {
    const Announcement = require('../models/announcement');
    const announcement = await Announcement.findById(announcementId);

    if (!announcement || !announcement.poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Default userVotes to empty array if undefined
    if (!announcement.poll.userVotes) announcement.poll.userVotes = [];

    const existingVoteIndex = announcement.poll.userVotes.findIndex(v => v.userId.toString() === userId);

    if (existingVoteIndex !== -1) {
      // User has already voted
      const existingVote = announcement.poll.userVotes[existingVoteIndex];

      if (existingVote.optionIndex === optionIndex) {
        // Deselect logic: Remove vote
        announcement.poll.options[optionIndex].votes = Math.max(0, announcement.poll.options[optionIndex].votes - 1);
        announcement.poll.userVotes.splice(existingVoteIndex, 1); // Remove user record
      } else {
        // Change vote: Decrement old, Increment new
        const oldIndex = existingVote.optionIndex;
        if (announcement.poll.options[oldIndex]) {
          announcement.poll.options[oldIndex].votes = Math.max(0, announcement.poll.options[oldIndex].votes - 1);
        }
        announcement.poll.options[optionIndex].votes += 1;

        // Update user's unique vote record
        announcement.poll.userVotes[existingVoteIndex].optionIndex = optionIndex;
      }

    } else {
      // New Vote
      announcement.poll.options[optionIndex].votes += 1;
      announcement.poll.userVotes.push({ userId, optionIndex });
    }

    await announcement.save();

    // Real-time update
    try {
      const io = require('../controllers/socketController').getIo();
      io.emit('pollUpdated', { announcementId: announcement._id, poll: announcement.poll });
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res.json({ success: true, poll: announcement.poll });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getUnreadCounts = async (req, res) => {
  try {
    const { userId, lastReadGD, lastReadAnnounce } = req.query;
    const Message = require('../models/message');
    const Announcement = require('../models/announcement');

    // 1. Private Chat Unread
    const chatCount = await Message.countDocuments({
      recipient: userId,
      read: false
    });

    // 2. GD Unread (created after last read time)
    let gdCount = 0;
    if (lastReadGD && lastReadGD !== 'null' && lastReadGD !== 'undefined') {
      gdCount = await Message.countDocuments({
        groupId: 'finance-gd',
        createdAt: { $gt: new Date(lastReadGD) }
      });
    } else {
      // If never read, show all (or limit to e.g. 50 recent to avoid huge number)
      gdCount = await Message.countDocuments({ groupId: 'finance-gd' });
    }

    // 3. Announcement Unread
    let announceCount = 0;
    if (lastReadAnnounce && lastReadAnnounce !== 'null' && lastReadAnnounce !== 'undefined') {
      announceCount = await Announcement.countDocuments({
        createdAt: { $gt: new Date(lastReadAnnounce) }
      });
    } else {
      announceCount = await Announcement.countDocuments({});
    }

    res.json({ chat: chatCount, gd: gdCount, announcement: announceCount });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
const scheduleMeeting = async (req, res) => {
  try {
    const { title, scheduledTime, hostId } = req.body;
    const Meeting = require('../models/meeting');

    // Simple code generation (6 chars upper)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const meeting = new Meeting({
      title,
      scheduledTime,
      hostId,
      code
    });

    await meeting.save();
    res.json({ success: true, meeting });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getMeetings = async (req, res) => {
  try {
    const Meeting = require('../models/meeting');
    // Fetch upcoming meetings
    const meetings = await Meeting.find({
      scheduledTime: { $gt: new Date() }
    }).sort({ scheduledTime: 1 }).populate('hostId', 'name');

    res.json(meetings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { userId } = req.body;
    const profilePicUrl = `/uploads/${req.file.filename}`;

    await User.findByIdAndUpdate(userId, { profilePic: profilePicUrl });

    res.json({ profilePic: profilePicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  signup,
  login,
  getGDMessages,
  getPrivateMessages,
  votePoll,
  getUnreadCounts,
  scheduleMeeting,
  getMeetings,
  uploadAvatar
};