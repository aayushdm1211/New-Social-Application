const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/user');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://vinayakmv:vinayakmv@cluster0.22wn3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        console.log("MongoDB Connected");

        const email = "vinayaksathisan20@gmail.com";
        const user = await User.findOne({ email });

        if (user) {
            user.role = "admin";
            await user.save();
            console.log(`Updated user ${user.name} (${user.email}) to role: ${user.role}`);
        } else {
            console.log("User not found");
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
