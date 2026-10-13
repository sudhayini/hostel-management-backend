const express = require("express");
const bcrypt = require("bcryptjs");

const Resident = require("../models/Resident");
const User = require("../models/user");
const Room = require("../models/Room");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Helper: update room occupancy and status
async function updateRoomOccupancy(roomNumber) {
  if (!roomNumber) return;

  const room = await Room.findOne({ roomNumber });
  if (!room) return;

  const occupied = await Resident.countDocuments({
    roomNumber: room.roomNumber,
  });

  room.occupied = occupied;

  // Preserve rooms marked for maintenance.
  if (room.status !== "Maintenance") {
    if (occupied === 0) {
      room.status = "Available";
    } else if (occupied >= room.capacity) {
      room.status = "Full";
    } else {
      room.status = "Occupied";
    }
  }

  await room.save();
}

// GET RESIDENTS
router.get("/", authMiddleware, async (req, res) => {
  try {
    let residents;

    if (req.user.role === "admin" || req.user.role === "staff") {
      // Admin and staff can view all residents.
      residents = await Resident.find();
    } else if (req.user.role === "resident") {
      // Residents can only view their own record.
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(401).json({
          message: "User account not found",
        });
      }

      residents = await Resident.find({
        email: user.email,
      });
    } else {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    res.json(residents);
  } catch (error) {
    console.log("Fetch residents error:", error);
    res.status(500).json({
      message: "Failed to fetch residents",
    });
  }
});


// GET ONE RESIDENT PROFILE
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id);

    if (!resident) {
      return res.status(404).json({
        message: "Resident not found",
      });
    }

    // Admin and staff can view any resident profile.
    if (req.user.role === "admin" || req.user.role === "staff") {
      return res.json(resident);
    }

    // Residents can view only their own profile.
    if (req.user.role === "resident") {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(401).json({
          message: "User account not found",
        });
      }

      if (
        user.email.toLowerCase() !==
        resident.email.toLowerCase()
      ) {
        return res.status(403).json({
          message: "You can only view your own profile",
        });
      }

      return res.json(resident);
    }

    return res.status(403).json({
      message: "Access denied",
    });
  } catch (error) {
    console.log("Fetch resident profile error:", error);

    // An invalid MongoDB ID should not cause a server error.
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid resident ID",
      });
    }

    res.status(500).json({
      message: "Failed to fetch resident profile",
    });
  }
});

// CREATE RESIDENT
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const {
        name,
        phone,
        emergencyContactName,
        emergencyContactPhone,
        email,
        roomNumber,
        checkInDate,
        expectedCheckOutDate,
      } = req.body;

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          message: "A user account with this email already exists",
        });
      }

      let room = null;

      if (roomNumber) {
        room = await Room.findOne({ roomNumber });

        if (!room) {
          return res.status(400).json({ message: "Room not found" });
        }

        if (room.status === "Maintenance") {
          return res.status(400).json({
            message: "Cannot allocate a room under maintenance",
          });
        }

        const occupied = await Resident.countDocuments({ roomNumber });

        if (occupied >= room.capacity) {
          return res.status(400).json({ message: "Room is full" });
        }
      }

      const resident = await Resident.create({
        name,
        phone,
        emergencyContactName,
        emergencyContactPhone,
        email,
        roomNumber: roomNumber || "",
        checkInDate: roomNumber ? (checkInDate || new Date()) : null,
        expectedCheckOutDate: expectedCheckOutDate || null,
        roomHistory: roomNumber
          ? [
              {
                roomNumber,
                checkInDate: checkInDate || new Date(),
                checkOutDate: null,
              },
            ]
          : [],
      });

      const hashedPassword = await bcrypt.hash("Resident@123", 10);

      try {
        await User.create({
          name,
          email,
          password: hashedPassword,
          role: "resident",
        });
      } catch (error) {
        await Resident.findByIdAndDelete(resident._id);
        throw error;
      }

      if (roomNumber) {
        await updateRoomOccupancy(roomNumber);
      }

      res.status(201).json({
        message: "Resident and login account created successfully",
        resident,
      });
    } catch (error) {
      console.log("Resident creation error:", error);
      res.status(400).json({
        message: error.message || "Failed to create resident",
      });
    }
  }
);

// UPDATE RESIDENT DETAILS OR ROOM ALLOCATION
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const resident = await Resident.findById(req.params.id);

      if (!resident) {
        return res.status(404).json({ message: "Resident not found" });
      }

      const {
        name,
        phone,
        emergencyContactName,
        emergencyContactPhone,
        email,
        roomNumber,
        checkInDate,
        expectedCheckOutDate,
      } = req.body;

      const previousRoomNumber = resident.roomNumber || "";
      const changingRoom = roomNumber !== undefined &&
        roomNumber !== previousRoomNumber;

      if (changingRoom && roomNumber) {
        const newRoom = await Room.findOne({ roomNumber });

        if (!newRoom) {
          return res.status(400).json({ message: "Room not found" });
        }

        if (newRoom.status === "Maintenance") {
          return res.status(400).json({
            message: "Cannot allocate a room under maintenance",
          });
        }

        const occupied = await Resident.countDocuments({
          roomNumber,
          _id: { $ne: resident._id },
        });

        if (occupied >= newRoom.capacity) {
          return res.status(400).json({ message: "Room is full" });
        }
      }

      if (name !== undefined) resident.name = name;
      if (phone !== undefined) resident.phone = phone;
      if (emergencyContactName !== undefined) {
        resident.emergencyContactName = emergencyContactName;
      }
      if (emergencyContactPhone !== undefined) {
        resident.emergencyContactPhone = emergencyContactPhone;
      }
      if (email !== undefined) resident.email = email;
      if (expectedCheckOutDate !== undefined) {
        resident.expectedCheckOutDate = expectedCheckOutDate || null;
      }

      if (changingRoom) {
        // Close the previous room-history entry.
        const activeHistory = [...resident.roomHistory]
          .reverse()
          .find(
            (entry) =>
              entry.roomNumber === previousRoomNumber &&
              entry.checkOutDate === null
          );

        if (activeHistory) {
          activeHistory.checkOutDate = new Date();
        }

        resident.roomNumber = roomNumber || "";

        if (roomNumber) {
          const newCheckInDate = checkInDate || new Date();

          resident.checkInDate = newCheckInDate;
          resident.roomHistory.push({
            roomNumber,
            checkInDate: newCheckInDate,
            checkOutDate: null,
          });
        } else {
          // Check-out: resident no longer occupies a room.
          resident.checkInDate = null;
        }
      } else if (checkInDate !== undefined) {
        resident.checkInDate = checkInDate || null;
      }

      await resident.save();

      if (changingRoom) {
        await updateRoomOccupancy(previousRoomNumber);
        await updateRoomOccupancy(resident.roomNumber);
      }

      res.json(resident);
    } catch (error) {
      console.log("Update resident error:", error);
      res.status(400).json({
        message: error.message || "Failed to update resident",
      });
    }
  }
);

// DELETE RESIDENT (ADMIN ONLY)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const resident = await Resident.findById(req.params.id);

      if (!resident) {
        return res.status(404).json({ message: "Resident not found" });
      }

      const assignedRoom = resident.roomNumber || "";

      const user = await User.findOne({
        email: resident.email,
        role: "resident",
      });

      if (user) {
        await User.findByIdAndDelete(user._id);
      }

      await Resident.findByIdAndDelete(resident._id);

      if (assignedRoom) {
        await updateRoomOccupancy(assignedRoom);
      }

      res.json({
        message: "Resident and login account deleted successfully",
      });
    } catch (error) {
      console.log("Delete resident error:", error);
      res.status(400).json({
        message: error.message || "Failed to delete resident",
      });
    }
  }
);

module.exports = router;
