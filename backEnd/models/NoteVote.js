const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const NoteVoteSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, index: true },
    note_id: { type: Number, required: true, index: true },
    value: { type: Number, required: true },
  },
  { versionKey: false }
);

applyJsonTransform(NoteVoteSchema);

module.exports = mongoose.model("NoteVote", NoteVoteSchema);

