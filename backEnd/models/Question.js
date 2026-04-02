const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const QuestionSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    author_id: { type: Number, required: true, index: true },
    image_url: { type: String, default: null },
    rating: { type: Number, default: 0 },
  },
  { versionKey: false }
);

applyJsonTransform(QuestionSchema);

module.exports = mongoose.model("Question", QuestionSchema);

