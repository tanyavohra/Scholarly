const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const CommentVoteSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, index: true },
    comment_id: { type: Number, required: true, index: true },
    value: { type: Number, required: true },
  },
  { versionKey: false }
);

applyJsonTransform(CommentVoteSchema);

module.exports = mongoose.model("CommentVote", CommentVoteSchema);

