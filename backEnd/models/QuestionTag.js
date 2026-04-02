const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const QuestionTagSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    question_id: { type: Number, required: true, index: true },
    tag_id: { type: Number, required: true, index: true },
    author_id: { type: Number, default: null, index: true },
  },
  { versionKey: false }
);

applyJsonTransform(QuestionTagSchema);

module.exports = mongoose.model("QuestionTag", QuestionTagSchema);

