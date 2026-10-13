const mongoose = require("mongoose");

const roomHistorySchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const residentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    emergencyContactName: {
      type: String,
      default: "",
    },

    emergencyContactPhone: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      required: true,
    },

    roomNumber: {
      type: String,
      default: "",
    },

    checkInDate: {
      type: Date,
      default: null,
    },

    expectedCheckOutDate: {
      type: Date,
      default: null,
    },

    roomHistory: {
      type: [roomHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Resident = mongoose.model("Resident", residentSchema);

module.exports = Resident;
