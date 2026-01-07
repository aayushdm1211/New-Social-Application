const socketIo = require('socket.io');
const Message = require('../models/message');
const User = require('../models/user');

let io;

exports.init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected', socket.id);

        socket.on('join', (userId) => {
            socket.join(userId);
            console.log(`User ${userId} joined room ${userId}`);
        });

        socket.on('joinAnnouncement', (announcementId) => {
            socket.join(announcementId);
            console.log(`User joined announcement room ${announcementId}`);
        });



        socket.on('joinGD', () => {
            socket.join('finance-gd');
            console.log(`User ${socket.id} joined GD`);
        });

        socket.on('leaveGD', () => {
            socket.leave('finance-gd');
            console.log(`User ${socket.id} left GD`);
        });

        socket.on('sendMessage', async (data) => {
            console.log("Socket received message:", data);
            try {
                const newMessage = new Message(data);
                await newMessage.save();
                await newMessage.populate('sender', 'name profilePic role');

                if (data.recipient) {
                    // 1:1 Chat
                    console.log("Routing to 1:1:", data.recipient);
                    io.to(data.recipient).emit('receiveMessage', newMessage);
                    io.to(data.sender).emit('receiveMessage', newMessage);
                } else if (data.announcementId) {
                    // Announcement Broadcast
                    console.log("Routing to Announcement:", data.announcementId);
                    io.to(data.announcementId).emit('receiveAnnouncement', newMessage);
                } else if (data.groupId) {
                    // Group Chat (GD)
                    console.log("Routing to GD Group:", data.groupId);
                    io.to(data.groupId).emit('receiveMessage', newMessage);
                } else {
                    console.log("Message has no routing target!");
                }
            } catch (err) {
                console.error("Message error:", err);
            }
        });

        socket.on('markAsDelivered', async ({ msgId, userId }) => {
            try {
                const message = await Message.findById(msgId);
                if (message && message.status === 'sent') {
                    message.status = 'delivered';
                    await message.save();
                    io.to(message.sender.toString()).emit('messageStatusUpdate', { msgId, status: 'delivered' });
                }
            } catch (e) {
                console.error("Mark Delivered Error:", e);
            }
        });

        socket.on('markAsRead', async ({ msgId, userId }) => {
            try {
                const message = await Message.findById(msgId);
                // If it's already read, no need to update, but if sent/delivered -> read
                if (message && message.status !== 'read') {
                    message.status = 'read';
                    message.read = true; // Sync legacy field
                    await message.save();
                    io.to(message.sender.toString()).emit('messageStatusUpdate', { msgId, status: 'read' });
                }
            } catch (e) {
                console.error("Mark Read Error:", e);
            }
        });

        socket.on('deleteMessage', async ({ msgId, userId }) => {
            try {
                const message = await Message.findById(msgId);
                if (!message) return;

                // Verify ownership
                if (message.sender.toString() !== userId) {
                    console.log("Unauthorized delete attempt");
                    return;
                }

                await Message.findByIdAndDelete(msgId);
                console.log(`Message ${msgId} deleted`);

                // Notify relevant parties
                if (message.recipient) {
                    io.to(message.recipient.toString()).emit('messageDeleted', msgId);
                    io.to(message.sender.toString()).emit('messageDeleted', msgId);
                } else if (message.groupId) {
                    io.to(message.groupId).emit('messageDeleted', msgId);
                }
            } catch (err) {
                console.error("Delete error:", err);
            }
        });

        // WebRTC Signaling
        socket.on('join-meet', (roomId) => {
            socket.join(roomId);
            socket.to(roomId).emit('user-connected', socket.id);
        });

        socket.on('offer', (data) => {
            socket.to(data.roomId).emit('offer', data);
        });

        socket.on('answer', (data) => {
            socket.to(data.roomId).emit('answer', data);
        });

        socket.on('ice-candidate', (data) => {
            socket.to(data.roomId).emit('ice-candidate', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });
};

exports.getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
