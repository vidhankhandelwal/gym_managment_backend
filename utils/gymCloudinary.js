const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { Readable } = require("stream");
const sharp = require("sharp");

// Reuse the cloudinary config already set in cloudinary.js via env vars
// (cloudinary.config is global once called — but to be safe we call it here too)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer: memory storage, 5 MB limit, images + videos only ─────────────────
const gymMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      return cb(null, true);
    }
    cb(new Error("Only image and video files are allowed"), false);
  },
});

// ── Single-field logo / cover upload (image only, compressed) ─────────────────
const gymSingleImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed for logo/cover"), false);
  },
});

/**
 * Compress an image buffer with sharp and upload to Cloudinary.
 * Returns { url, public_id }.
 */
const compressAndUploadImage = (buffer, folder, options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const compressed = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image", ...options },
        (error, result) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );
      Readable.from(compressed).pipe(stream);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Upload a video buffer to Cloudinary (no sharp — sharp doesn't handle video).
 * Returns { url, public_id }.
 */
const uploadVideo = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "video" },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    Readable.from(buffer).pipe(stream);
  });
};

/**
 * Delete a cloudinary asset by public_id.
 * resource_type: "image" | "video"
 */
const deleteFromCloudinary = (public_id, resource_type = "image") =>
  cloudinary.uploader.destroy(public_id, { resource_type });

module.exports = {
  gymMediaUpload,
  gymSingleImageUpload,
  compressAndUploadImage,
  uploadVideo,
  deleteFromCloudinary,
};
