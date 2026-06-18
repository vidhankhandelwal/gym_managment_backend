const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOTPEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"Gym App" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: "Your OTP for Registration",
    html: `<p>Your OTP is: <b>${otp}</b>. It expires in 10 minutes.</p>`,
  });
};

const sendResetPasswordEmail = async (to, resetLink) => {
  await transporter.sendMail({
    from: `"Gym App" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: "Reset Your Password",
    html: `
      <p>You requested a password reset.</p>
      <p>Click the button below to reset your password. This link expires in <b>15 minutes</b>.</p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
};

module.exports = { sendOTPEmail, sendResetPasswordEmail };
