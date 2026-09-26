const mongoose = require("mongoose");
const maintenanceSchema = new mongoose.Schema(
  {
    residentName: {
      type: String,
      required: true,
    },

    roomNumber: {
      type: String,
      required: true,
    },

    issue: {
      type: String,
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },

    assignedStaff: {
      type: String,
      default: "",
   },
  },
  {
    timestamps: true,
  }
);

const Maintenance = mongoose.model(
  "Maintenance",
  maintenanceSchema
);
module.exports = Maintenance;