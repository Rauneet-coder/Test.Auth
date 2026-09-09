import Usermodel from "../models/user.model.js";
import crypto from "crypto"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

export const registerUser = (async (req, res) => {
    const { username, email, password } = req.body;

    const isAlreadyExists = await Usermodel.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    if (isAlreadyExists) {
        return res.status(409).json({ message: "User already exists" });
    }

    // const hashedPass = await crypto.createHash("sha256").update(password).digest("hex") Not used Crypto for hashing password 
    // as it is not recommended for password hashing. Instead, we can use bcrypt library for hashing password. 

    const hashedPass = await bcrypt.hash(password, 12);
    const user = await Usermodel.create({
        username,
        email,
        password: hashedPass
    })

    const token = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({
        message: "User registered successfully",
        user: {
            username: user.username,
            email: user.email,
        },
        token: token
    })
})

export const Login = (async (req, res) => {
    const { username, email, password } = req.body;

    const user = await Usermodel.findOne({
        $or: [
            { username },
            { email }
        ]
    })
})