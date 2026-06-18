const router = require("express").Router();
const { authenticate } = require("../middlewares/authMiddleware");
const { validateGym, requireGymOwner } = require("../middlewares/gymValidate");
const { gymMediaUpload } = require("../utils/gymCloudinary");
const {
  createGym,
  getMyGym,
  updateGym,
  deleteGym,
  getGym,
} = require("../controllers/gymController");

// ── Multer: handles logo (1), cover_image (1), media (up to 25) ──────────────
const gymUpload = gymMediaUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "cover_image", maxCount: 1 },
  { name: "media", maxCount: 25 },
]);

// ── Multer wrapper with clean JSON errors ─────────────────────────────────────
const handleMulterErrors = (err, res) => {
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ success: false, message: "A file exceeds the 5 MB size limit" });
  if (err.code === "LIMIT_FILE_COUNT")
    return res.status(400).json({ success: false, message: "Too many files. Maximum 25 media files allowed" });
  return res.status(400).json({ success: false, message: err.message });
};

// ── Smart upload middleware:
//    - multipart/form-data → run multer (handles files + text fields)
//    - application/json    → skip multer, body already parsed by express.json()
// ─────────────────────────────────────────────────────────────────────────────
const smartUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    gymUpload(req, res, (err) => {
      if (err) return handleMulterErrors(err, res);
      next();
    });
  } else {
    // JSON body — multer not needed, req.body already populated
    req.files = req.files || {};
    next();
  }
};

// ── Public routes ─────────────────────────────────────────────────────────────
router.get("/:id", getGym);                                           // GET by gym _id or owner _id

// ── Protected routes — gym_owner only ────────────────────────────────────────
router.get("/my", authenticate, requireGymOwner, getMyGym);     // GET self

router.post("/", authenticate, requireGymOwner, smartUpload, validateGym(false), createGym);   // CREATE
router.put("/:gymId", authenticate, requireGymOwner, smartUpload, validateGym(true), updateGym);   // UPDATE
router.delete("/:gymId", authenticate, requireGymOwner, deleteGym);                                    // DELETE

module.exports = router;
