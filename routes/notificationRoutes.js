
const express = require("express");
const Notification = require("../models/notification");
const authMiddleware = require("../middleware/authmiddleware");

const router = express.Router();

// post notifiication
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, type } = req.body;

    const notification = await Notification.create({
      userId: req.user.id,
      message,
      type,
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create notification",
    });
  }
});

// fetch users notifications
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
});


router.put(
  "/:id/read",
  authMiddleware,
  async (req, res) => {
    try {
      const notification =
        await Notification.findOneAndUpdate(
          {
            _id: req.params.id,
            userId: req.user.id,
          },
          {
            isRead: true,
          },
          {
            new: true,
          }
        );

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found",
        });
      }

      res.json(notification);
    } catch (error) {
      res.status(500).json({
        message: "Failed to mark notification as read",
      });
    }
  }
);

// delte notification
router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const notification =
        await Notification.findOneAndDelete({
          _id: req.params.id,
          userId: req.user.id,
        });

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found",
        });
      }

      res.json({
        message: "Notification deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to delete notification",
      });
    }
  }
);

module.exports = router;

