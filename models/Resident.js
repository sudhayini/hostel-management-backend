const mongoose = require("mongoose");
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
  },
  {
    timestamps: true,
  }
);

const Resident = mongoose.model("Resident", residentSchema);
module.exports = Resident;