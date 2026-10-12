const mongoose = require("mongoose");
const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
    },
 
    roomType:{
      type: String,
      enum:["Single","Double","Triple","Shared"],
      default:"Shared",
      required:true,
    },
    
    rent:{ 
      type:Number,
      required:true,
      min:0,
      default:0,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    occupied:{
      type: Number,
      default:0,
      min:0,
    },

    status:{
      type:String,
      enum:["Available","Occupied","Full","Maintenance"],
      default:"Available",
    },
  },
  {
    timestamps: true,
  }
);

const Room = mongoose.model("Room", roomSchema);
module.exports = Room;