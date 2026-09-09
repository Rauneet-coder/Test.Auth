import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Must provide a username"],
        unique:[ true, "Username already exists" ],
    },
    email: {
        type: String,
        required: [true, "Must provide an email"],
        unique: [true, "Email already exists"],

    },
    password: {
        type: String,
        required: [true, "Must provide a password"],
    }

})

const Usermodel = mongoose.model("Users", userSchema);

export default Usermodel;