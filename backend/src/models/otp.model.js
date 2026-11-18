import mongoose from "mongoose";


const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [ true, "Email is required" ],
        lowercase: true,
        trim: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: [ true, "User is required" ],
        index: true
    },
    otpHash: {
        type: String,
        required: [ true, "OTP hash is required" ]
    },
    failedAttempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 5
    },
    deletedAt: {
        type: Date,
        default: () => new Date(Date.now() + 300 * 1000),
        expires: 0
    },
}, {
    timestamps: true
});

otpSchema.index({ email: 1, deletedAt: 1 });

const otpModel = mongoose.model("otps", otpSchema)

export default otpModel;