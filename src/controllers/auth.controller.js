import Usermodel from "../models/user.model.js";
import crypto from "crypto"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";

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

    // Save session to DB so /refresh-token can validate it later
    await sessionModel.create({
        user: user._id,
        refreshTokenHash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
        ip: req.ip,
        userAgent: req.headers["user-agent"]
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

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

    try {
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
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
})

export const refreshToken = (async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken){
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    const oldRefreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
    const user = await Usermodel.findById(decoded.id);
    if (!user){
        return res.status(404).json({ message: "User not found" });
    }

    const session = await sessionModel.findOne({
        refreshTokenHash: oldRefreshTokenHash,
        revoked: false
    })

    if (!session) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const newAccessToken = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET,
        {
            expiresIn: "15m"
        });

    const newRefreshToken = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET,
        {
            expiresIn: "7d"
        });

    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex")
    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();

    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.status(200).json({
        message: "Access token refreshed successfully",
        accessToken: newAccessToken
    })
});




export const Login = (async (req, res) => {
    const { username, email, password } = req.body;

    const user = await Usermodel.findOne({
        $or: [
            { username },
            { email }
        ]

    })
})