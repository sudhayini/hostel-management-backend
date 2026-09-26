
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");


dotenv.config();

// Check if MongoDB URI is loaded
console.log("MongoDB URI loaded:", !!process.env.MONGO_URI);

const app = express();

app.use(cors());
app.use(express.json());


const roomRoutes = require("./routes/roomRoutes");
const residentRoutes = require("./routes/residentRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const billingRoutes = require("./routes/billingRoutes");
const authRoutes = require("./routes/authRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");


app.use("/api/rooms", roomRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);


app.get("/", (req, res) => {
  res.send("Hostel Management Backend Running");
});

const PORT = process.env.PORT || 5000;

// connect mongodb
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error.message);
  });