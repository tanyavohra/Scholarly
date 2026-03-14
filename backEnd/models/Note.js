const mongoose = require("mongoose");
const applyJsonTransform = require("./_transform");

const NoteSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    course_name: { type: String, required: true },
    semester: { type: String, required: true },
    prof_name: { type: String, required: true },
    course_description: { type: String, required: true },
    author_id: { type: Number, required: true, index: true },
    votes: { type: Number, default: 0 },
    pdf: { type: String, required: true },
    file_name: { type: String, required: true },
    file_size: { type: Number, required: true },
    rating: { type: Number, default: 0 },
  },
  { versionKey: false }
);

applyJsonTransform(NoteSchema);

module.exports = mongoose.model("Note", NoteSchema);

