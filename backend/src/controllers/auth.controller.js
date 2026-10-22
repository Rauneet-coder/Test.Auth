import Usermodel from "../models/user.model.js";
import crypto from "crypto"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";
import { sendEmail } from "../services/email.service.js";
import { generateOtp, getOtpHtml } from "../utils/utils.js";
import otpModel from "../models/otp.model.js";

export const healthcheck = (async (req, res) => {
    res.status(200).json({
        message: "OK"
    });
})  

export const registerUser = (async (req, res) => {
    const { username, email, password } = req.body;

    const isAlreadyExists = await Usermodel.findOne({
        $or: [
            { username },
            { email }
        ],
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

    const otp = generateOtp();
    const otpHtml = getOtpHtml(otp);
    
    await otpModel.create({
        email,
        user: user._id,
        otpHash: crypto.createHash("sha256").update(otp).digest("hex")
    });

    await sendEmail(email, "OTP Verification", `Your OTP code is ${otp}`, otpHtml)

    res.status(201).json({
        message: "User registered successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    })

})

export const login = (async (req, res) => {
    const { email, password } = req.body;

    const user = await Usermodel.findOne({email});
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }

    if(!user.verified){
        return res.status(400).json({message: "Email not verified"});
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid password" });
    }
    
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

    res.status(200).json({
        message: "User logged in successfully",
        user: {
            username: user.username,
            email: user.email,
        },
        accessToken
    })
})

export const getMe = (async (req, res) => {
    // req.user is guaranteed to exist here because the authenticate
    // middleware runs before this handler and already verified the JWT,
    // looked up the user, and attached them to the request object.
    res.status(200).json({
        message: "User found",
        user: {
            username: req.user.username,
            email: req.user.email
        }
    });
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

export const logout = (async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken){
        return res.status(401).json({ message: "Already logout!" });
    }
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    const user = await Usermodel.findById(decoded.id);
    if (!user){
        return res.status(404).json({ message: "User not found" });
    }

    const session = await sessionModel.findOne({
        refreshTokenHash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
        revoked: false
    })

    if (!session) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    session.revoked = true;
    await session.save();

    res.clearCookie("refreshToken");

    res.status(200).json({ message: "User logged out successfully" });

})

export const logoutAll = (async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token not found" });
    }

    try {
        const decoded = jwt.verify(refreshToken, config.JWT_SECRET)

        await sessionModel.updateMany({
            user: decoded.id,
            revoked: false
        }, {
            revoked: true
        })
    } catch (error) {
        // Token might be invalid/expired, just proceed to clear cookie
    }

    res.clearCookie("refreshToken")

    res.status(200).json({
        message: "Logged out from all devices successfully"
    })

});

export async function verifyEmail(req, res) {
    const { otp, email } = req.body

    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");

    const otpDoc = await otpModel.findOne({
        email,
        otpHash,
        deletedAt: { $gt: new Date() }
    })

    if (!otpDoc) {
        return res.status(400).json({
            message: "Invalid OTP"
        })
    }

    const user = await Usermodel.findByIdAndUpdate(otpDoc.user, {
        verified: true
    }, { new: true })

    await otpModel.deleteMany({
        user: otpDoc.user
    })

    return res.status(200).json({
        message: "Email verified successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    })
}