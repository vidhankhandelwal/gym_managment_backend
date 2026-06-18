const mongoose = require("mongoose");

const gymSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gym_name: {
      type: String,
      required: true,
      trim: true,
    },
    gym_slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    logo: { type: String, default: "" },
    cover_image: { type: String, default: "" },
    description: { type: String, trim: true },
    contact_number: { type: String, trim: true },
    whatsapp_number: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    location: {
      address: { type: String, trim: true },
      landmark: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      latitude: { type: Number },
      longitude: { type: Number },
      google_map_link: { type: String, trim: true },
    },
    gym_timings: {
      monday_to_saturday: {
        open: { type: String },
        close: { type: String },
      },
      sunday: {
        open: { type: String },
        close: { type: String },
      },
    },
    facilities: [{ type: String, trim: true }],
    special_features: [{ type: String, trim: true }],
    // media: up to 25 images/videos
    media: [
      {
        url: { type: String, required: true },
        resource_type: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
        public_id: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gym", gymSchema);
