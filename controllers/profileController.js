const User = require("../models/User");
const { compressAndUpload } = require("../utils/cloudinary");

// GET /api/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "full_name email mobile_no role profile_image status last_login createdAt"
    );
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, mobile_no } = req.body;

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (mobile_no && mobile_no !== user.mobile_no) {
      const mobileExists = await User.findOne({ mobile_no, _id: { $ne: user._id } });
      if (mobileExists)
        return res.status(409).json({ success: false, message: "Mobile number is already in use" });
      user.mobile_no = mobile_no;
    }

    if (full_name) user.full_name = full_name;

    if (req.file) {
      user.profile_image = await compressAndUpload(req.file.buffer);
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        full_name: user.full_name,
        email: user.email,
        mobile_no: user.mobile_no,
        role: user.role,
        profile_image: user.profile_image,
        status: user.status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getProfile, updateProfile };
