
const express = require("express");
const Notification = require("../models/notification");
const authMiddleware = require("../middleware/authmiddleware");
const { sendSMS } = require("../services/smsService");
const Resident = require("../models/Resident");
const User = require("../models/user");

const router = express.Router();

const allowedTypes = [
  "Overdue",
  "Due Soon",
  "Maintenance",
  "General",
];

// Create an in-app notification for the logged-in user.
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, type = "General" } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Notification message is required",
      });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid notification type",
      });
    }

    const notification = await Notification.create({
      userId: req.user.id,
      message: message.trim(),
      type,
    });

    return res.status(201).json(notification);
  } catch (error) {
    console.error("Create notification error:", error.message);

    return res.status(500).json({
      message: "Failed to create notification",
    });
  }
});

// Fetch notifications.
// Residents see only their own notifications.
// Admin/staff see all notifications.
router.get("/", authMiddleware, async (req, res) => {
  try {
    const isStaffOrAdmin = ["admin", "staff"].includes(req.user.role);

    const notifications = await Notification.find(
      isStaffOrAdmin ? {} : { userId: req.user.id }
    ).sort({ createdAt: -1 });

    return res.json(notifications);
  } catch (error) {
    console.error("Fetch notification error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
});

// Send a notification to one resident or all residents.
// Only admin and staff may use this endpoint.
router.post("/send-sms", authMiddleware, async (req, res) => {
  try {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only admin or staff can send notifications",
      });
    }

    const {
      residentId,
      sendToAll = false,
      message,
      type = "General",
    } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Notification message is required",
      });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid notification type",
      });
    }

    if (typeof sendToAll !== "boolean") {
      return res.status(400).json({
        message: "sendToAll must be true or false",
      });
    }

    if (!sendToAll && !residentId) {
      return res.status(400).json({
        message: "Select a resident or choose All Residents",
      });
    }

    const residents = sendToAll
      ? await Resident.find({})
      : [await Resident.findById(residentId)].filter(Boolean);

    if (residents.length === 0) {
      return res.status(404).json({
        message: sendToAll
          ? "No residents found"
          : "Resident not found",
      });
    }

    const results = [];

    for (const resident of residents) {
      try {
        if (!resident.email) {
          results.push({
            resident: resident.name,
            inAppSaved: false,
            smsSubmitted: false,
            error: "Resident email is missing",
          });
          continue;
        }

        const residentUser = await User.findOne({
          email: resident.email,
          role: "resident",
        });

        if (!residentUser) {
          results.push({
            resident: resident.name,
            inAppSaved: false,
            smsSubmitted: false,
            error: "Resident login account not found",
          });
          continue;
        }

        // Save the resident's in-app notification first.
        await Notification.create({
          userId: residentUser._id,
          message: message.trim(),
          type,
        });

        // Save a copy for the admin/staff sender.
        await Notification.create({
          userId: req.user.id,
          message: `Notification sent to ${resident.name}: ${message.trim()}`,
          type,
        });

        let smsSubmitted = false;
        let smsStatus = null;
        let smsSid = null;
        let smsError = null;

        // SMS may fail on a Twilio trial account if the
        // recipient is not verified. The in-app notification remains saved.
        if (resident.phone) {
          try {
            const smsResult = await sendSMS(
              resident.phone,
              message.trim()
            );

            smsSubmitted = true;
            smsStatus = smsResult.status;
            smsSid = smsResult.sid;
          } catch (error) {
            smsError = error.message;
            console.error(
              `SMS failed for resident ${resident.name}:`,
              error.message,
              "Twilio code:",
              error.code
            );
          }
        } else {
          smsError = "Resident phone number is missing";
        }

        results.push({
          resident: resident.name,
          inAppSaved: true,
          smsSubmitted,
          smsStatus,
          smsSid,
          smsError,
        });
      } catch (residentError) {
        console.error(
          `Notification failed for ${resident.name}:`,
          residentError.message
        );

        results.push({
          resident: resident.name,
          inAppSaved: false,
          smsSubmitted: false,
          error: "Failed to process this resident's notification",
        });
      }
    }

    const inAppSaved = results.filter(
      (item) => item.inAppSaved
    ).length;

    const smsSubmitted = results.filter(
      (item) => item.smsSubmitted
    ).length;

    const smsFailed = results.filter(
      (item) => item.inAppSaved && !item.smsSubmitted
    ).length;

    return res.status(201).json({
      message: `In-app notifications saved for ${inAppSaved} resident(s). SMS submitted for ${smsSubmitted} resident(s).`,
      summary: {
        totalResidents: residents.length,
        inAppSaved,
        smsSubmitted,
        smsFailed,
      },
      results,
    });
  } catch (error) {
    console.error("Send resident notification error:", error.message);

    return res.status(500).json({
      message: "Failed to send resident notification",
    });
  }
});

// Mark a notification as read.
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.json(notification);
  } catch (error) {
    console.error("Mark notification read error:", error.message);

    return res.status(500).json({
      message: "Failed to mark notification as read",
    });
  }
});

// Delete a notification belonging to the logged-in user.
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error.message);

    return res.status(500).json({
      message: "Failed to delete notification",
    });
  }
});

module.exports = router;
