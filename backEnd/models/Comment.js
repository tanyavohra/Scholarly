const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const CommentSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    content: { type: String, required: true },
    user_id: { type: Number, required: true, index: true },
    question_id: { type: Number, required: true, index: true },
    rating: { type: Number, default: 0 },
  },
  { versionKey: false }
);

applyJsonTransform(CommentSchema);

module.exports = mongoose.model("Comment", CommentSchema);

