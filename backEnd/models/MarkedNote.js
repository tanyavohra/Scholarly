const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const MarkedNoteSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, index: true },
    note_id: { type: Number, required: true, index: true },
  },
  { versionKey: false }
);

applyJsonTransform(MarkedNoteSchema);

module.exports = mongoose.model("MarkedNote", MarkedNoteSchema);

