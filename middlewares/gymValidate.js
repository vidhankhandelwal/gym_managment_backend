/**
 * Validation middleware for Gym APIs
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;
const timeRegex = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i; // e.g. 06:00 AM
const urlRegex = /^https?:\/\/.+/i;
const googleMapRegex = /^https?:\/\/(maps\.google\.com|goo\.gl|maps\.app\.goo\.gl|www\.google\.[a-z]+\/maps).+/i;

const respond = (res, errors) =>
  res.status(400).json({ success: false, errors });

// ── Create / Update Gym ───────────────────────────────────────────────────────
const validateGym = (isUpdate = false) => (req, res, next) => {
  const errors = [];
  const b = req.body;

  // gym_name — required on create
  if (!isUpdate || b.gym_name !== undefined) {
    if (!b.gym_name || !String(b.gym_name).trim())
      errors.push("gym_name is required");
    else if (String(b.gym_name).trim().length < 2 || String(b.gym_name).trim().length > 100)
      errors.push("gym_name must be between 2 and 100 characters");
  }

  // description — optional, max 1000 chars
  if (b.description !== undefined && String(b.description).length > 2000)
    errors.push("description must not exceed 2000 characters");

  // contact_number
  if (b.contact_number !== undefined && b.contact_number !== "") {
    if (!mobileRegex.test(String(b.contact_number).trim()))
      errors.push("contact_number must be a valid 10-digit Indian mobile number");
  }

  // whatsapp_number
  if (b.whatsapp_number !== undefined && b.whatsapp_number !== "") {
    if (!mobileRegex.test(String(b.whatsapp_number).trim()))
      errors.push("whatsapp_number must be a valid 10-digit Indian mobile number");
  }

  // email
  if (b.email !== undefined && b.email !== "") {
    if (!emailRegex.test(String(b.email).trim()))
      errors.push("Invalid email format");
  }

  // website
  if (b.website !== undefined && b.website !== "") {
    if (!urlRegex.test(String(b.website).trim()))
      errors.push("website must be a valid URL starting with http:// or https://");
  }

  // ── location ────────────────────────────────────────────────────────────────
  if (b.location) {
    let loc;
    try {
      loc = typeof b.location === "string" ? JSON.parse(b.location) : b.location;
    } catch {
      errors.push("location must be a valid JSON object");
      loc = null;
    }

    if (loc) {
      if (loc.pincode && !pincodeRegex.test(String(loc.pincode).trim()))
        errors.push("location.pincode must be a 6-digit number");

      if (loc.latitude !== undefined && loc.latitude !== "") {
        const lat = parseFloat(loc.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90)
          errors.push("location.latitude must be a number between -90 and 90");
      }

      if (loc.longitude !== undefined && loc.longitude !== "") {
        const lng = parseFloat(loc.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180)
          errors.push("location.longitude must be a number between -180 and 180");
      }

      if (loc.google_map_link && !googleMapRegex.test(String(loc.google_map_link).trim()))
        errors.push("location.google_map_link must be a valid Google Maps URL");
    }
  }

  // ── gym_timings ─────────────────────────────────────────────────────────────
  if (b.gym_timings) {
    let timings;
    try {
      timings = typeof b.gym_timings === "string" ? JSON.parse(b.gym_timings) : b.gym_timings;
    } catch {
      errors.push("gym_timings must be a valid JSON object");
      timings = null;
    }

    if (timings) {
      const checkSlot = (slot, label) => {
        if (!slot) return;
        if (slot.open && !timeRegex.test(String(slot.open).trim()))
          errors.push(`${label}.open must be in format HH:MM AM/PM (e.g. 06:00 AM)`);
        if (slot.close && !timeRegex.test(String(slot.close).trim()))
          errors.push(`${label}.close must be in format HH:MM AM/PM (e.g. 10:00 PM)`);
      };

      checkSlot(timings.monday_to_saturday, "gym_timings.monday_to_saturday");
      checkSlot(timings.sunday, "gym_timings.sunday");
    }
  }

  // ── facilities & special_features ──────────────────────────────────────────
  if (b.facilities !== undefined) {
    let arr;
    try {
      arr = typeof b.facilities === "string" ? JSON.parse(b.facilities) : b.facilities;
      if (!Array.isArray(arr)) errors.push("facilities must be an array of strings");
      else if (arr.length > 50) errors.push("facilities cannot have more than 50 items");
    } catch {
      errors.push("facilities must be a valid JSON array");
    }
  }

  if (b.special_features !== undefined) {
    let arr;
    try {
      arr = typeof b.special_features === "string" ? JSON.parse(b.special_features) : b.special_features;
      if (!Array.isArray(arr)) errors.push("special_features must be an array of strings");
      else if (arr.length > 50) errors.push("special_features cannot have more than 50 items");
    } catch {
      errors.push("special_features must be a valid JSON array");
    }
  }

  // ── status ──────────────────────────────────────────────────────────────────
  if (b.status !== undefined && !["active", "inactive"].includes(b.status))
    errors.push("status must be 'active' or 'inactive'");

  if (errors.length) return respond(res, errors);
  next();
};

// ── Role guard: only gym_owner allowed ───────────────────────────────────────
const requireGymOwner = (req, res, next) => {
  if (req.user?.role !== "gym_owner")
    return res.status(403).json({
      success: false,
      message: "Access denied. Only gym owners can perform this action.",
    });
  next();
};

module.exports = { validateGym, requireGymOwner };
