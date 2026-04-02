const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const MarkedQuestionSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, index: true },
    question_id: { type: Number, required: true, index: true },
  },
  { versionKey: false }
);

applyJsonTransform(MarkedQuestionSchema);

module.exports = mongoose.model("MarkedQuestion", MarkedQuestionSchema);

