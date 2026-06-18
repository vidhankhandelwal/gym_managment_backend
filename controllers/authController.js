const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendOTPEmail, sendResetPasswordEmail } = require("../utils/mailer");
const { compressAndUpload } = require("../utils/cloudinary");
const { addToBlacklist } = require("../middlewares/authMiddleware");

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const existing = await User.findOne({ email, is_email_verified: true });
    if (existing)
      return res.status(409).json({ success: false, message: "Email is already registered" });

    const otp = generateOTP();
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await User.findOneAndUpdate(
      { email },
      { $set: { otp, otp_expires_at, is_email_verified: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: false }
    );

    await sendOTPEmail(email, otp);
    res.json({ success: true, message: "OTP sent to your email. Valid for 10 minutes." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "No account found with this email" });

    if (!user.otp || !user.otp_expires_at)
      return res.status(400).json({ success: false, message: "OTP not requested. Please request a new OTP." });

    if (user.otp_expires_at < new Date())
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });

    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.is_email_verified = true;
    user.otp = null;
    user.otp_expires_at = null;
    await user.save();

    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { full_name, email, mobile_no, role } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.is_email_verified)
      return res.status(400).json({ success: false, message: "Please verify your email first" });

    const mobileExists = await User.findOne({ mobile_no, email: { $ne: email } });
    if (mobileExists)
      return res.status(409).json({ success: false, message: "Mobile number is already in use" });

    user.full_name = full_name;
    user.mobile_no = mobile_no;
    if (role) user.role = role;

    // upload profile image if provided
    if (req.file) {
      user.profile_image = await compressAndUpload(req.file.buffer);
    }

    await user.save();
    res.json({ success: true, message: "Details saved. Please set your password." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/set-password
const setPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "No account found with this email" });

    if (!user.is_email_verified)
      return res.status(400).json({ success: false, message: "Email not verified" });

    if (!user.full_name || !user.mobile_no)
      return res.status(400).json({ success: false, message: "Complete the register step before setting password" });

    user.password = await bcrypt.hash(password, 10);
    user.status = "active";
    await user.save();

    res.json({ success: true, message: "Password set successfully. You can now login." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "No account found with this email" });

    if (!user.is_email_verified)
      return res.status(403).json({ success: false, message: "Email not verified. Please complete registration." });

    if (user.status === "blocked")
      return res.status(403).json({ success: false, message: "Your account has been blocked. Contact support." });

    if (user.status === "pending")
      return res.status(403).json({ success: false, message: "Account setup is incomplete. Please set your password." });

    if (user.status === "rejected")
      return res.status(403).json({ success: false, message: "Your account has been rejected. Contact support." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Incorrect password" });

    user.last_login = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        mobile_no: user.mobile_no,
        role: user.role,
        status: user.status,
        last_login: user.last_login,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, is_email_verified: true });
    if (!user)
      return res.status(404).json({ success: false, message: "No verified account found with this email" });

    if (user.status === "blocked")
      return res.status(403).json({ success: false, message: "Your account is blocked. Contact support." });

    // generate a secure random token
    const crypto = require("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.reset_password_token = hashedToken;
    user.reset_password_expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;
    await sendResetPasswordEmail(email, resetLink);

    res.json({ success: true, message: "Password reset link sent to your email. Valid for 15 minutes." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, token, new_password } = req.body;

    const crypto = require("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({ email, reset_password_token: hashedToken });
    if (!user)
      return res.status(400).json({ success: false, message: "Invalid or expired reset link" });

    if (user.reset_password_expires_at < new Date())
      return res.status(400).json({ success: false, message: "Reset link has expired. Please request a new one." });

    const isSamePassword = await bcrypt.compare(new_password, user.password);
    if (isSamePassword)
      return res.status(400).json({ success: false, message: "New password cannot be the same as the old password" });

    user.password = await bcrypt.hash(new_password, 10);
    user.reset_password_token = null;
    user.reset_password_expires_at = null;
    await user.save();

    res.json({ success: true, message: "Password reset successfully. You can now login." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  addToBlacklist(req.token);
  res.json({ success: true, message: "Logged out successfully" });
};

module.exports = {
  sendOtp,
  verifyOtp,
  register,
  setPassword,
  login,
  forgotPassword,
  resetPassword,
  logout,
};
