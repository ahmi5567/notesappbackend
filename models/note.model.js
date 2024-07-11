import mongoose from "mongoose";

const notesSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: {type: [String] , default: false },
  isPinned: { type: Boolean, default: false },
  userId: { type: String, required: true },
  createdAt: { type: Date,  default: new Date().getTime() },
})

const NotesModel = mongoose.model('Notes' , notesSchema);

export default NotesModel;