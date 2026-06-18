const router = require("express").Router();
const {
  sendOtp,
  verifyOtp,
  register,
  setPassword,
  login,
  forgotPassword,
  resetPassword,
  logout,
} = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");
const { upload } = require("../utils/cloudinary");
const {
  validateSendOtp,
  validateVerifyOtp,
  validateRegister,
  validateSetPassword,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../middlewares/validate");

router.post("/send-otp", validateSendOtp, sendOtp);
router.post("/verify-otp", validateVerifyOtp, verifyOtp);
router.post("/register", upload.single("profile_image"), validateRegister, register);
router.post("/set-password", validateSetPassword, setPassword);
router.post("/login", validateLogin, login);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);
router.post("/logout", authenticate, logout);


module.exports = router;
