import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import config from "./config.json" assert { type: "json" };
import jwt from "jsonwebtoken";
import authenticationToken from "./utilities.js";
import User from "./models/user.model.js";
import Notes from "./models/note.model.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

// MONGODB CONNECT
try {
  mongoose.connect(config.connectionString);
  console.log("Connected to MongoDB");
} catch (e) {
  console.log("error connecting");
}
// TESTS
app.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

// CREATE ACCOUNT
app.post("/create-account", async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(403).send({
      message: "Please provide all required fields",
    });
  }

  const isUser = await User.findOne({ email: email });
  if (isUser) {
    return res.status(403).send({
      message: "User already exists",
    });
  }

  const user = await User.create({
    fullname,
    email,
    password,
  });
  await user.save();

  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000m",
  });

  return res.json({
    error: false,
    user,
    accessToken,
    message: "User created successfully",
  });
});
// LOGIN USER
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(403).send({
      message: "Please provide all required fields",
    });
  }

  const userInfo = await User.findOne({ email: email });

  if (!userInfo) {
    return res.status(403).send({
      message: "User not found",
    });
  }

  if (userInfo.email === email && userInfo.password === password) {
    const user = { user: userInfo };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "36000m",
    });

    return res.json({
      error: false,
      email,
      accessToken,
      message: "User logged in successfully",
    });
  } else {
    return res.status(403).send({
      message: "Incorrect email or password",
    });
  }
});
// GET USERS
app.get("/get-user", authenticationToken, async (req, res) => {
  const { user } = req.user;

  const isUser = await User.findOne({ _id: user._id });

  if (!isUser) {
    return res.status(403).send({
      message: "User not found",
    });
  }

  return res.status(200).send({
    user: {
      fullname: isUser.fullname,
      email: isUser.email,
      _id: isUser._id,
      createdOn: isUser.createdOn,
    },
    message: "Users fetched successfully",
  });
});
// ADD NOTES
app.post("/add-note", authenticationToken, async (req, res) => {
  const { title, content, tags } = req.body;
  const { user } = req.user;

  if (!title || !content || !tags) {
    return res.status(403).send({
      message: "Please provide all required fields",
    });
  }

  try {
    const note = new Notes({
      title,
      content,
      tags: tags || [],
      userId: user._id,
    });
    await note.save();
    return res.json({
      error: false,
      note,
      message: "Note added successfully",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error adding note",
      error,
    });
  }
});
// EDIT NOTES
app.put("/edit-note/:noteId", authenticationToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { title, content, tags, isPinned } = req.body;
  const { user } = req.user;

  if (!title && !content && !tags) {
    return res.status(403).send({
      message: "Please provide at least one field to update",
    });
  }

  try {
    const note = await Notes.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res.status(404).send({
        message: "Note not found",
      });
    }

    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note updated successfully",
    });
  } catch (error) {
    return res.json({
      message: "Error updating note",
      error: true,
    });
  }
});
// GET ALL NOTES
app.get("/getAllNotes", authenticationToken, async (req, res) => {
  const { user } = req.user;
  try {
    const notes = await Notes.find({ userId: user._id }).sort({ isPinned: -1 });
    return res.json({
      error: false,
      notes,
      message: "Notes fetched successfully",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error fetching notes",
      error: true,
    });
  }
});
// DELETE NOTES
app.delete("/deleteNotes/:noteId", authenticationToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { user } = req.user;

  try {
    const note = await Notes.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    await note.deleteOne({ _id: noteId, userId: user._id });

    return res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error deleting note", error: true });
  }
});
// UPDATE isPinned Value
app.put("/updateNotePinned/:noteId", authenticationToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { isPinned } = req.body;
  const { user } = req.user;

  if (!isPinned) {
    return res.status(403).send({
      message: "Please provide at least one field to update",
    });
  }

  try {
    const note = await Notes.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res.status(404).send({
        message: "Note not found",
      });
    }

    if (isPinned) note.isPinned = isPinned;

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note updated successfully",
    });
  } catch (error) {
    return res.json({
      message: "Error updating note",
      error: true,
    });
  }
});
// SEARCH QUERY 
app.get('/search-notes', authenticationToken , async  (req, res) => {
  const { query } = req.query;
  const { user } = req.user;

  if(!query){
    return res.status(400).json({ message: 'Please provide a search query' });
  }

  try {
    const matchingNotes = await Notes.find({
      userId: user._id,
      $or:[
        {title: {$regex: new RegExp(query, "i")}},
        {content: {$regex: new RegExp(query, "i")}},
      ]
    })
    return res.json({
      error: false,
      notes: matchingNotes,
      message: 'Notes fetched successfully',
    });

  } catch (error) {
    return res.status(500).json({ message: 'Error searching notes', error: true });
  }

});


app.listen(8000);

export default app;
