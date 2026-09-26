const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// Register Resident
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "resident",
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
    });
  }
});


// get staff user
// admin+staff can view
router.get(
  "/staff",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const staff = await User.find(
        { role: "staff" },
        { name: 1, email: 1 }
      );

      res.json(staff);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch staff users",
      });
    }
  }
);


// add staff(admin only)
router.post(
  "/staff",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          message: "Name, email and password are required",
        });
      }

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          message: "A user with this email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const staff = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "staff",
      });

      res.status(201).json({
        message: "Staff created successfully",
        staff: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        },
      });
    } catch (error) {
      console.log("Create staff error:", error);

      res.status(500).json({
        message: "Failed to create staff",
      });
    }
  }
);


// update staff(admin only)

router.put(
  "/staff/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { name, email } = req.body;

      const staff = await User.findOneAndUpdate(
        {
          _id: req.params.id,
          role: "staff",
        },
        {
          name,
          email,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!staff) {
        return res.status(404).json({
          message: "Staff not found",
        });
      }

      res.json({
        message: "Staff updated successfully",
        staff: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        },
      });
    } catch (error) {
      console.log("Update staff error:", error);

      res.status(500).json({
        message: "Failed to update staff",
      });
    }
  }
);


// delete staff(admin only)
router.delete(
  "/staff/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const staff = await User.findOneAndDelete({
        _id: req.params.id,
        role: "staff",
      });

      if (!staff) {
        return res.status(404).json({
          message: "Staff not found",
        });
      }

      res.json({
        message: "Staff deleted successfully",
      });
    } catch (error) {
      console.log("Delete staff error:", error);

      res.status(500).json({
        message: "Failed to delete staff",
      });
    }
  }
);

module.exports = router;