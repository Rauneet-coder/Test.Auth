import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Must provide a username"],
        unique: [true, "Username already exists"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Must provide an email"],
        unique: [true, "Email already exists"],
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Must provide a password"],
    },
    verified:{
        type: Boolean,
        default: false
    }
}, {
    autoIndex: true
});

const Usermodel = mongoose.model("Users", userSchema);

export default Usermodel;