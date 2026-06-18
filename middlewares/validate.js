// Central validation middleware
// Each validator returns a middleware function

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRegex = /^[6-9]\d{9}$/; // Indian 10-digit mobile
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const nameRegex = /^[a-zA-Z\s]{2,50}$/;
const validRoles = ["admin", "gym_owner", "user"];

const respond = (res, errors) =>
  res.status(400).json({ success: false, errors });

// ── send-otp ──────────────────────────────────────────────────────────────────
const validateSendOtp = (req, res, next) => {
  const errors = [];
  const { email } = req.body;

  if (!email || typeof email !== "string" || !email.trim())
    errors.push("Email is required");
  else if (!emailRegex.test(email.trim()))
    errors.push("Invalid email format");

  if (errors.length) return respond(res, errors);
  req.body.email = email.trim().toLowerCase();
  next();
};

// ── verify-otp ────────────────────────────────────────────────────────────────
const validateVerifyOtp = (req, res, next) => {
  const errors = [];
  const { email, otp } = req.body;

  if (!email || !email.trim()) errors.push("Email is required");
  else if (!emailRegex.test(email.trim())) errors.push("Invalid email format");

  if (!otp || typeof otp !== "string" || !otp.trim()) errors.push("OTP is required");
  else if (!/^\d{6}$/.test(otp.trim())) errors.push("OTP must be a 6-digit number");

  if (errors.length) return respond(res, errors);
  req.body.email = email.trim().toLowerCase();
  req.body.otp = otp.trim();
  next();
};

// ── register ──────────────────────────────────────────────────────────────────
const validateRegister = (req, res, next) => {
  const errors = [];
  const { full_name, email, mobile_no, role } = req.body;

  if (!full_name || !full_name.trim()) errors.push("Full name is required");
  else if (!nameRegex.test(full_name.trim()))
    errors.push("Full name must be 2-50 alphabetic characters only");

  if (!email || !email.trim()) errors.push("Email is required");
  else if (!emailRegex.test(email.trim())) errors.push("Invalid email format");

  if (!mobile_no || !mobile_no.trim()) errors.push("Mobile number is required");
  else if (!mobileRegex.test(mobile_no.trim()))
    errors.push("Mobile number must be a valid 10-digit Indian number starting with 6-9");

  if (role && !validRoles.includes(role))
    errors.push(`Role must be one of: ${validRoles.join(", ")}`);

  if (errors.length) return respond(res, errors);
  req.body.full_name = full_name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.mobile_no = mobile_no.trim();
  next();
};

// ── set-password ──────────────────────────────────────────────────────────────
const validateSetPassword = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || !email.trim()) errors.push("Email is required");
  else if (!emailRegex.test(email.trim())) errors.push("Invalid email format");

  if (!password || !password.trim()) errors.push("Password is required");
  else if (!passwordRegex.test(password))
    errors.push(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&)"
    );

  if (errors.length) return respond(res, errors);
  req.body.email = email.trim().toLowerCase();
  next();
};

// ── login ─────────────────────────────────────────────────────────────────────
const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || !email.trim()) errors.push("Email is required");
  else if (!emailRegex.test(email.trim())) errors.push("Invalid email format");

  if (!password || !password.trim()) errors.push("Password is required");

  if (errors.length) return respond(res, errors);
  req.body.email = email.trim().toLowerCase();
  next();
};

// ── forgot-password ───────────────────────────────────────────────────────────
const validateForgotPassword = (req, res, next) => {
  const errors = [];
  const { email } = req.body;

  if (!email || !email.trim()) errors.push("Email is required");
  else if (!emailRegex.test(email.trim())) errors.push("Invalid email format");

  if (errors.length) return respond(res, errors);
  req.body.email = email.trim().toLowerCase();
  next();
};

// ── reset-password ────────────────────────────────────────────────────────────
const validateResetPassword = (req, res, next) => {
  const errors = [];
  const { email, token, new_password } = req.body;

  if (!email || !email.trim()) errors.push("Email is required");
  else if (!emailRegex.test(email.trim())) errors.push("Invalid email format");

  if (!token || !token.trim()) errors.push("Reset token is required");

  if (!new_password || !new_password.trim()) errors.push("New password is required");
  else if (!passwordRegex.test(new_password))
    errors.push(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&)"
    );

  if (errors.length) return respond(res, errors);
  req.body.email = email.trim().toLowerCase();
  req.body.token = token.trim();
  next();
};

// ── update-profile ────────────────────────────────────────────────────────────
const validateUpdateProfile = (req, res, next) => {
  const errors = [];
  const { full_name, mobile_no } = req.body;

  if (full_name !== undefined) {
    if (!full_name.trim()) errors.push("Full name cannot be empty");
    else if (!nameRegex.test(full_name.trim()))
      errors.push("Full name must be 2-50 alphabetic characters only");
  }

  if (mobile_no !== undefined) {
    if (!mobile_no.trim()) errors.push("Mobile number cannot be empty");
    else if (!mobileRegex.test(mobile_no.trim()))
      errors.push("Mobile number must be a valid 10-digit Indian number starting with 6-9");
  }

  if (errors.length) return respond(res, errors);
  if (full_name) req.body.full_name = full_name.trim();
  if (mobile_no) req.body.mobile_no = mobile_no.trim();
  next();
};

module.exports = {
  validateSendOtp,
  validateVerifyOtp,
  validateRegister,
  validateSetPassword,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
};
