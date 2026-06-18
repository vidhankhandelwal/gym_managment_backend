const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const sharp = require("sharp");
const { Readable } = require("stream");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage so we can compress with sharp before uploading
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Only image files are allowed"), false);
    cb(null, true);
  },
});

// Compress with sharp then upload to Cloudinary, returns secure_url
const compressAndUpload = async (fileBuffer, folder = "gym_app/profiles") => {
  const compressed = await sharp(fileBuffer)
    .resize({ width: 400, height: 400, fit: "cover" })
    .jpeg({ quality: 75 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    Readable.from(compressed).pipe(stream);
  });
};

module.exports = { upload, compressAndUpload };
