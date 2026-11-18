import { AppError } from "../errors/AppError.js";
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

    let user;
    let isNewUser = false;

    if (isAlreadyExists) {
        // If the existing user is verified or if credentials belong to distinct users
        if (isAlreadyExists.verified || isAlreadyExists.email !== email || isAlreadyExists.username !== username) {
            throw new AppError(409, "RESOURCE_CONFLICT", "User already exists");
        }

        // Registration recovery: allow an unverified user to recover their registration
        const hashedPass = await bcrypt.hash(password, 12);
        isAlreadyExists.password = hashedPass;
        await isAlreadyExists.save();
        user = isAlreadyExists;

        // Invalidate old OTPs for this unverified registration
        await otpModel.deleteMany({ email });
    } else {
        const hashedPass = await bcrypt.hash(password, 12);
        try {
            user = await Usermodel.create({
                username,
                email,
                password: hashedPass
            });
            isNewUser = true;
        } catch (dbError) {
            if (dbError.code === 11000) {
                throw new AppError(409, "RESOURCE_CONFLICT", "User already exists");
            }
            throw dbError;
        }
    }

    const otp = generateOtp();
    const otpHtml = getOtpHtml(otp);
    
    await otpModel.create({
        email,
        user: user._id,
        otpHash: crypto.createHash("sha256").update(otp).digest("hex")
    });

    try {
        await sendEmail(email, "OTP Verification", `Your OTP code is ${otp}`, otpHtml);
    } catch {
        // Propagate failure and clean up to prevent leaving behind an unverified zombie user
        await otpModel.deleteMany({ email });
        if (isNewUser) {
            await Usermodel.deleteOne({ _id: user._id });
        }
        throw new AppError(500, "INTERNAL_SERVER_ERROR", "Failed to send verification email");
    }

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
        throw new AppError(400, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    if(!user.verified){
        throw new AppError(400, "EMAIL_NOT_VERIFIED", "Email not verified");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError(400, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    
    const accessToken = jwt.sign({
        id: user._id,
        tokenUse: "access"
    }, config.JWT_SECRET, {
        expiresIn: "15m"
    });

    const refreshToken = jwt.sign({
        id: user._id,
        jti: crypto.randomUUID(),
        tokenUse: "refresh"
    }, config.JWT_SECRET, {
        expiresIn: "7d"
    });

    // Save session to DB so /refresh-token can validate it later
    await sessionModel.create({
        user: user._id,
        refreshTokenHash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
        ip: req.ip || "127.0.0.1",
        userAgent: req.headers["user-agent"] || "unknown"
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
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is required");
    }
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    } catch {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

    // Require exact refresh claim
    if (decoded.tokenUse !== "refresh") {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

    const oldRefreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
    const user = await Usermodel.findById(decoded.id);
    if (!user){
        throw new AppError(404, "RESOURCE_NOT_FOUND", "User not found");
    }

    const newAccessToken = jwt.sign({
        id: user._id,
        tokenUse: "access"
    }, config.JWT_SECRET, {
        expiresIn: "15m"
    });

    const newRefreshToken = jwt.sign({
        id: user._id,
        jti: crypto.randomUUID(),
        tokenUse: "refresh"
    }, config.JWT_SECRET, {
        expiresIn: "7d"
    });

    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    // Atomically rotate the token using a conditional database update.
    // If concurrent requests present the same refresh token, only one succeeds;
    // subsequent or concurrent requests find no matching document and are rejected.
    const session = await sessionModel.findOneAndUpdate(
        {
            refreshTokenHash: oldRefreshTokenHash,
            revoked: false
        },
        {
            $set: {
                refreshTokenHash: newRefreshTokenHash,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        },
        { returnDocument: "after" }
    );

    if (!session) {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

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
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is required");
    }
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    } catch {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

    // Require exact refresh claim
    if (decoded.tokenUse !== "refresh") {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

    const user = await Usermodel.findById(decoded.id);
    if (!user){
        throw new AppError(404, "RESOURCE_NOT_FOUND", "User not found");
    }

    const session = await sessionModel.findOneAndUpdate(
        {
            refreshTokenHash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
            revoked: false
        },
        {
            $set: { revoked: true }
        },
        { returnDocument: "after" }
    );

    if (!session) {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

    res.clearCookie("refreshToken");

    res.status(200).json({ message: "User logged out successfully" });

})

export const logoutAll = (async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is required");
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    } catch {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

    // Require exact refresh claim
    if (decoded.tokenUse !== "refresh") {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const activeSession = await sessionModel.findOne({
        refreshTokenHash,
        revoked: false
    });

    if (!activeSession) {
        throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
    }

    await sessionModel.updateMany({
        user: decoded.id,
        revoked: false
    }, {
        revoked: true
    });

    res.clearCookie("refreshToken");

    res.status(200).json({
        message: "Logged out from all devices successfully"
    });
});

export const verifyEmail = (async(req, res) => {
    const { otp, email } = req.body;

    const otpDoc = await otpModel.findOne({
        email,
        deletedAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
        throw new AppError(400, "INVALID_OTP", "Invalid OTP");
    }

    const MAX_ATTEMPTS = otpDoc.maxAttempts || 5;

    // Check if the OTP is already locked out due to prior failed attempts
    if (otpDoc.failedAttempts >= MAX_ATTEMPTS) {
        await otpModel.deleteMany({ email });
        return res.status(400).json({
            message: "Too many failed attempts. OTP has expired."
        });
    }

    const inputHash = crypto.createHash("sha256").update(String(otp)).digest("hex");

    if (otpDoc.otpHash !== inputHash) {
        // Atomically increment failed attempts
        const updatedDoc = await otpModel.findOneAndUpdate(
            { _id: otpDoc._id },
            { $inc: { failedAttempts: 1 } },
            { returnDocument: "after" }
        );

        // Lockout and expiry handling if attempt limit reached
        if (updatedDoc && updatedDoc.failedAttempts >= MAX_ATTEMPTS) {
            await otpModel.deleteMany({ email });
            return res.status(400).json({
                message: "Too many failed attempts. OTP has expired."
            });
        }

        throw new AppError(400, "INVALID_OTP", "Invalid OTP");
    }

    const user = await Usermodel.findByIdAndUpdate(otpDoc.user, {
        verified: true
    }, { returnDocument: "after" });

    if (!user) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "User not found");
    }

    await otpModel.deleteMany({
        user: otpDoc.user
    });

    return res.status(200).json({
        message: "Email verified successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    });
})

export const resendOtp = (async(req, res) => {
    const { email } = req.body;

    const user = await Usermodel.findOne({ email });
    if (!user) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "User not found");
    }

    if (user.verified) {
        return res.status(400).json({ message: "Email already verified" });
    }

    // Enforce 60-second cooldown between resend requests (configurable via OTP_RESEND_COOLDOWN_SECONDS, 0 in test mode by default)
    const cooldownSeconds = process.env.OTP_RESEND_COOLDOWN_SECONDS !== undefined
        ? Number(process.env.OTP_RESEND_COOLDOWN_SECONDS)
        : (process.env.NODE_ENV === "test" ? 0 : 60);

    if (cooldownSeconds > 0) {
        const recentOtp = await otpModel.findOne({
            email,
            createdAt: { $gt: new Date(Date.now() - cooldownSeconds * 1000) }
        });
        if (recentOtp) {
            return res.status(429).json({
                message: `Please wait ${cooldownSeconds} seconds before requesting another verification code`
            });
        }
    }

    // Invalidate prior OTPs
    await otpModel.deleteMany({ email });

    const otp = generateOtp();
    const otpHtml = getOtpHtml(otp);

    await otpModel.create({
        email,
        user: user._id,
        otpHash: crypto.createHash("sha256").update(otp).digest("hex")
    });

    try {
        await sendEmail(email, "OTP Verification", `Your OTP code is ${otp}`, otpHtml);
    } catch {
        await otpModel.deleteMany({ email });
        throw new AppError(500, "INTERNAL_SERVER_ERROR", "Failed to send verification email");
    }

    return res.status(200).json({
        message: "Verification code sent successfully"
    });
})