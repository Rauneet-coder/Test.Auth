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

    const accessToken = jwt.sign({
        id: user._id,

    }, config.JWT_SECRET,
        {
            expiresIn: "15m"
        });

    const refreshToken = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET,
        {
            expiresIn: "7d"
        });


    res.status(201).json({
        message: "User registered successfully",
        user: {
            username: user.username,
            email: user.email,
        },
        accessToken

    })
})

export const getMe = (async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const decodedToken = jwt.verify(token, config.JWT_SECRET);
    const user = await Usermodel.findById(decodedToken.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
        message: "User found",
        user: {
            username: user.username,
            email: user.email
        }
    })
})

const Login = (async (req, res) => {
    const { username, email, password } = req.body;

    const user = await Usermodel.findOne({
        $or: [
            username,
            email
        ]

    })
})