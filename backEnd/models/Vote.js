const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const VoteSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, index: true },
    question_id: { type: Number, default: null, index: true },
    comment_id: { type: Number, default: null, index: true },
    value: { type: Number, required: true },
  },
  { versionKey: false }
);

applyJsonTransform(VoteSchema);

module.exports = mongoose.model("Vote", VoteSchema);

