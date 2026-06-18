const Gym = require("../models/Gym");
const mongoose = require("mongoose");
const {
  compressAndUploadImage,
  uploadVideo,
  deleteFromCloudinary,
} = require("../utils/gymCloudinary");

// ── helper: generate unique slug ─────────────────────────────────────────────
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const makeUniqueSlug = async (gymName, excludeId = null) => {
  let base = slugify(gymName);
  let slug = base;
  let counter = 1;
  while (true) {
    const query = { gym_slug: slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Gym.findOne(query);
    if (!exists) return slug;
    slug = `${base}-${counter++}`;
  }
};

// ── helper: parse JSON fields from multipart/form-data ───────────────────────
const parseMaybeJSON = (value) => {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
};

// ── helper: upload all media files (images + videos) ─────────────────────────
const uploadMediaFiles = async (files) => {
  const uploaded = [];
  for (const file of files) {
    const isVideo = file.mimetype.startsWith("video/");
    const folder = isVideo ? "gym_app/media/videos" : "gym_app/media/images";
    const { url, public_id } = isVideo
      ? await uploadVideo(file.buffer, folder)
      : await compressAndUploadImage(file.buffer, folder);
    uploaded.push({ url, public_id, resource_type: isVideo ? "video" : "image" });
  }
  return uploaded;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gym
// Create gym with all info + logo + cover_image + media (up to 25) in one shot
// ─────────────────────────────────────────────────────────────────────────────
const createGym = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const existing = await Gym.findOne({ owner_id: ownerId });
    if (existing)
      return res.status(409).json({
        success: false,
        message: "You already have a gym. Use the update endpoint to make changes.",
      });

    const {
      gym_name, description, contact_number,
      whatsapp_number, email, website, status,
    } = req.body;

    const location = parseMaybeJSON(req.body.location);
    const gym_timings = parseMaybeJSON(req.body.gym_timings);
    const facilities = parseMaybeJSON(req.body.facilities);
    const special_features = parseMaybeJSON(req.body.special_features);

    const gym_slug = await makeUniqueSlug(gym_name);

    // ── logo ─────────────────────────────────────────────────────────────────
    let logoUrl = "";
    if (req.files?.logo?.[0]) {
      const { url } = await compressAndUploadImage(req.files.logo[0].buffer, "gym_app/logos");
      logoUrl = url;
    }

    // ── cover_image ──────────────────────────────────────────────────────────
    let coverUrl = "";
    if (req.files?.cover_image?.[0]) {
      const { url } = await compressAndUploadImage(req.files.cover_image[0].buffer, "gym_app/covers");
      coverUrl = url;
    }

    // ── media gallery (images + videos, max 25) ───────────────────────────────
    const mediaFiles = req.files?.media || [];
    if (mediaFiles.length > 25)
      return res.status(400).json({
        success: false,
        message: "You can upload a maximum of 25 media files.",
      });

    const media = await uploadMediaFiles(mediaFiles);

    const gym = await Gym.create({
      owner_id: ownerId,
      gym_name: gym_name.trim(),
      gym_slug,
      logo: logoUrl,
      cover_image: coverUrl,
      description,
      contact_number,
      whatsapp_number,
      email: email ? String(email).toLowerCase() : undefined,
      website,
      location,
      gym_timings,
      facilities: Array.isArray(facilities) ? facilities : [],
      special_features: Array.isArray(special_features) ? special_features : [],
      media,
      status: status || "active",
    });

    res.status(201).json({ success: true, message: "Gym created successfully", gym });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gym/my
// Get the logged-in owner's gym
// ─────────────────────────────────────────────────────────────────────────────
const getMyGym = async (req, res) => {
  try {
    const gym = await Gym.findOne({ owner_id: req.user.id });
    if (!gym)
      return res.status(404).json({ success: false, message: "No gym found for this owner" });

    res.json({ success: true, gym });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/gym/:gymId
// Update gym by gym _id — owner must match the logged-in user
// Accepts both application/json and multipart/form-data
//
// Remove fields supported:
//   remove_logo: true          → clears logo
//   remove_cover_image: true   → clears cover_image
//   remove_media: ["id1","id2"] → removes those media subdocs from gallery
// ─────────────────────────────────────────────────────────────────────────────
const updateGym = async (req, res) => {
  try {
    const { gymId } = req.params;

    if (!gymId.match(/^[a-fA-F0-9]{24}$/))
      return res.status(400).json({ success: false, message: "Invalid gym ID format" });

    const gym = await Gym.findById(gymId);
    if (!gym)
      return res.status(404).json({ success: false, message: "Gym not found" });

    if (gym.owner_id.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: "You are not authorized to update this gym" });

    const {
      gym_name, description, contact_number,
      whatsapp_number, email, website, status,
    } = req.body;

    // ── text fields ───────────────────────────────────────────────────────────
    if (gym_name !== undefined) { gym.gym_name = gym_name.trim(); gym.gym_slug = await makeUniqueSlug(gym_name, gym._id); }
    if (description !== undefined) gym.description = description;
    if (contact_number !== undefined) gym.contact_number = contact_number;
    if (whatsapp_number !== undefined) gym.whatsapp_number = whatsapp_number;
    if (email !== undefined) gym.email = String(email).toLowerCase();
    if (website !== undefined) gym.website = website;
    if (status !== undefined) gym.status = status;

    if (req.body.location !== undefined) {
      const loc = parseMaybeJSON(req.body.location);
      gym.location = { ...(gym.location?.toObject?.() ?? gym.location ?? {}), ...loc };
    }

    if (req.body.gym_timings !== undefined) {
      const timings = parseMaybeJSON(req.body.gym_timings);
      gym.gym_timings = { ...(gym.gym_timings?.toObject?.() ?? gym.gym_timings ?? {}), ...timings };
    }

    if (req.body.facilities !== undefined) {
      const arr = parseMaybeJSON(req.body.facilities);
      if (Array.isArray(arr)) gym.facilities = arr;
    }

    if (req.body.special_features !== undefined) {
      const arr = parseMaybeJSON(req.body.special_features);
      if (Array.isArray(arr)) gym.special_features = arr;
    }

    // ── remove_logo ───────────────────────────────────────────────────────────
    const removeLogo = parseMaybeJSON(req.body.remove_logo);
    if (removeLogo === true || removeLogo === "true") {
      gym.logo = "";
    }

    // ── remove_cover_image ────────────────────────────────────────────────────
    const removeCover = parseMaybeJSON(req.body.remove_cover_image);
    if (removeCover === true || removeCover === "true") {
      gym.cover_image = "";
    }

    // ── upload new logo (only if not removing) ────────────────────────────────
    if (!removeLogo && req.files?.logo?.[0]) {
      const { url } = await compressAndUploadImage(req.files.logo[0].buffer, "gym_app/logos");
      gym.logo = url;
    }

    // ── upload new cover_image (only if not removing) ─────────────────────────
    if (!removeCover && req.files?.cover_image?.[0]) {
      const { url } = await compressAndUploadImage(req.files.cover_image[0].buffer, "gym_app/covers");
      gym.cover_image = url;
    }

    // ── remove_media: array of media subdoc _ids to delete ────────────────────
    // Supports both field names: remove_media (frontend) & delete_media_ids (legacy)
    const removeMediaRaw = req.body.remove_media ?? req.body.delete_media_ids;
    if (removeMediaRaw !== undefined) {
      const ids = parseMaybeJSON(removeMediaRaw);

      // normalize: single string or array of strings
      const rawList = Array.isArray(ids) ? ids : [ids];

      const validIds = rawList
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(String(id)));

      if (validIds.length > 0) {
        // delete from Cloudinary first (before removing from array)
        for (const oid of validIds) {
          const item = gym.media.id(oid);
          if (item?.public_id) {
            await deleteFromCloudinary(item.public_id, item.resource_type);
          }
        }

        // filter out removed ids — most reliable approach
        gym.media = gym.media.filter(
          (m) => !validIds.some((oid) => oid.equals(m._id))
        );
      }
    }

    // ── upload new media files ────────────────────────────────────────────────
    const newMediaFiles = req.files?.media || [];
    if (newMediaFiles.length > 0) {
      const remainingSlots = 25 - gym.media.length;
      if (newMediaFiles.length > remainingSlots)
        return res.status(400).json({
          success: false,
          message: `Media limit reached. You have ${gym.media.length} file(s) and can only add ${remainingSlots} more (max 25 total).`,
        });
      const uploaded = await uploadMediaFiles(newMediaFiles);
      gym.media.push(...uploaded);
    }

    await gym.save();
    res.json({ success: true, message: "Gym updated successfully", gym });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/gym/:gymId
// Delete gym by gym _id — owner must match the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
const deleteGym = async (req, res) => {
  try {
    const { gymId } = req.params;

    if (!gymId.match(/^[a-fA-F0-9]{24}$/))
      return res.status(400).json({ success: false, message: "Invalid gym ID format" });

    const gym = await Gym.findById(gymId);
    if (!gym)
      return res.status(404).json({ success: false, message: "Gym not found" });

    // ensure the logged-in owner owns this gym
    if (gym.owner_id.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: "You are not authorized to delete this gym" });

    // clean up all Cloudinary media before deleting
    for (const item of gym.media) {
      if (item.public_id) await deleteFromCloudinary(item.public_id, item.resource_type);
    }

    await gym.deleteOne();
    res.json({ success: true, message: "Gym deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gym/:id
// Accepts either gym _id  OR  owner_id — public, no auth required
// Tries gym _id first; if not found falls back to owner_id lookup
// ─────────────────────────────────────────────────────────────────────────────
const getGym = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[a-fA-F0-9]{24}$/))
      return res.status(400).json({ success: false, message: "Invalid ID format" });

    // Try gym _id first
    let gym = await Gym.findById(id).populate(
      "owner_id",
      "full_name email mobile_no profile_image"
    );

    // If not found as gym _id, treat it as owner_id
    if (!gym) {
      gym = await Gym.findOne({ owner_id: id }).populate(
        "owner_id",
        "full_name email mobile_no profile_image"
      );
    }

    if (!gym)
      return res.status(404).json({ success: false, message: "Gym not found" });

    res.json({ success: true, gym });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createGym, getMyGym, updateGym, deleteGym, getGym };
