const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["admin", "gym_owner", "user"],
      required: true,
      default: "user",
    },
    full_name: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile_no: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    profile_image: {
      type: String,
      default: null,
    },
    is_email_verified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "active", "blocked", "rejected"],
      default: "pending",
    },
    last_login: {
      type: Date,
      default: null,
    },
    otp: {
      type: String,
      default: null,
    },
    otp_expires_at: {
      type: Date,
      default: null,
    },
    reset_password_token: {
      type: String,
      default: null,
    },
    reset_password_expires_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
