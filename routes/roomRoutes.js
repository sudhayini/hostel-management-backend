const express = require("express");
const mongoose = require("mongoose");
const Room = require("../models/Room");
const Resident = require("../models/Resident");
const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Calculate status based on occupancy
function getRoomStatus(room) {
  if (room.status === "Maintenance") {
    return "Maintenance";
  }

  const occupied = room.occupied || 0;

  if (occupied === 0) {
    return "Available";
  }

  if (occupied >= room.capacity) {
    return "Full";
  }

  return "Occupied";
}

// GET ALL ROOMS
router.get("/", authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find();

    const updatedRooms = rooms.map((room) => {
      const data = room.toObject();
      data.status = getRoomStatus(data);
      return data;
    });

    res.json(updatedRooms);
  } catch (error) {
    console.error("Fetch rooms error:", error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

// CREATE ROOM
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const { roomNumber, roomType, rent, capacity } = req.body;

      if (!roomNumber || !roomType || rent === undefined || capacity === undefined) {
        return res.status(400).json({
          message: "Room number, room type, rent and capacity are required",
        });
      }

      if (!Number.isFinite(Number(rent)) || Number(rent) < 0) {
        return res.status(400).json({ message: "Rent must be a non-negative number" });
      }

      if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
        return res.status(400).json({ message: "Capacity must be a positive integer" });
      }

      const room = await Room.create({
        roomNumber: roomNumber.trim(),
        roomType,
        rent: Number(rent),
        capacity: Number(capacity),
        occupied: 0,
        status: "Available",
      });

      res.status(201).json(room);
    } catch (error) {
      console.error("Create room error:", error);

      res.status(400).json({
        message: error.code === 11000
          ? "Room number already exists"
          : error.message || "Failed to create room",
      });
    }
  }
);

// UPDATE ROOM
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const room = await Room.findById(req.params.id);

      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const { roomNumber, roomType, rent, capacity, status } = req.body;

       console.log("UPDATE ROOM BODY:", req.body);
       console.log("RECEIVED STATUS:", status);

      if (roomNumber !== undefined) room.roomNumber = roomNumber.trim();
      if (roomType !== undefined) room.roomType = roomType;

      if (rent !== undefined) {
        if (!Number.isFinite(Number(rent)) || Number(rent) < 0) {
          return res.status(400).json({ message: "Rent must be a non-negative number" });
        }
        room.rent = Number(rent);
      }

      if (capacity !== undefined) {
        if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
          return res.status(400).json({ message: "Capacity must be a positive integer" });
        }

        if (Number(capacity) < (room.occupied || 0)) {
          return res.status(400).json({
            message: "Capacity cannot be less than the current occupancy",
          });
        }

        room.capacity = Number(capacity);
      }

         // Preserve Maintenance when explicitly selected.
        // Otherwise, calculate status from occupancy.
      if (status !== undefined) {
        if (!["Available", "Occupied", "Full", "Maintenance"].includes(status)) {
          return res.status(400).json({ message: "Invalid room status" });
        }

        if (status === "Maintenance") {
          room.status = "Maintenance";
        } else {
          room.status = getRoomStatus(room.toObject());
        }
      }
         else {
          room.status = getRoomStatus(room.toObject());
      }

      await room.save();
      res.json(room);
    } catch (error) {
      console.error("Update room error:", error);

      res.status(400).json({
        message: error.code === 11000
          ? "Room number already exists"
          : error.message || "Failed to update room",
      });
    }
  }
);

// DELETE ROOM
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const room = await Room.findById(req.params.id);

      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Prevent deletion while residents are assigned to this room.
      const assignedResidents = await Resident.countDocuments({
        roomNumber: room.roomNumber,
      });

      if (assignedResidents > 0) {
        return res.status(400).json({
          message: "Cannot delete a room while residents are assigned to it",
        });
      }

      await Room.findByIdAndDelete(req.params.id);

      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      console.error("Delete room error:", error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  }
);

module.exports = router;
