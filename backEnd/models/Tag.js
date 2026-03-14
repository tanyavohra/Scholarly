const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const TagSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true, index: true },
  },
  { versionKey: false }
);

applyJsonTransform(TagSchema);

module.exports = mongoose.model("Tag", TagSchema);

