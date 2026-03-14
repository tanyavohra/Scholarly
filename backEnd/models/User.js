const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const UserSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    token: { type: String, default: null },
  },
  { versionKey: false }
);

applyJsonTransform(UserSchema);

module.exports = mongoose.model("User", UserSchema);

