import mongoose from "mongoose"



const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: [ true, "User is required" ],
        index: true
    },
    refreshTokenHash: {
        type: String,
        required: [ true, "Refresh token hash is required" ],
        index: true
    },
    ip: {
        type: String,
        required: [ true, "IP address is required" ]
    },
    userAgent: {
        type: String,
        required: [ true, "User agent is required" ]
    },
    revoked: {
        type: Boolean,
        default: false,
        index: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        expires: 0
    }
}, {
    timestamps: true
});

sessionSchema.index({ user: 1, revoked: 1 });

const sessionModel = mongoose.model("sessions", sessionSchema)


export default sessionModel