const router = require("express").Router();
const { getProfile, updateProfile } = require("../controllers/profileController");
const { authenticate } = require("../middlewares/authMiddleware");
const { upload } = require("../utils/cloudinary");
const { validateUpdateProfile } = require("../middlewares/validate");

router.get("/", authenticate, getProfile);
router.put("/", authenticate, upload.single("profile_image"), validateUpdateProfile, updateProfile);

module.exports = router;
