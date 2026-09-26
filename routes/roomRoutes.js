const express = require("express");
const Room = require("../models/Room");
const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const router = express.Router();

// fetch all rooms
router.get("/",async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

// create new room
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const room = await Room.create(req.body);
      res.status(201).json(room);
    } catch (error) {
      res.status(400).json({ message: "Failed to create room" });
    }
  }
);
// update room
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    res.status(400).json({ message: "Failed to update room" });
  }
});

// delte room
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Failed to delete room" });
  }
});

module.exports = router;