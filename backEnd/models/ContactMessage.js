const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const ContactMessageSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    subject: { type: String, default: "" },
    message: { type: String, required: true },
    created_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

applyJsonTransform(ContactMessageSchema);

module.exports = mongoose.model("ContactMessage", ContactMessageSchema);

