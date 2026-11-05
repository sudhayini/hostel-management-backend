
const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// All expense routes require login
router.use(authMiddleware);

// View expenses: admin and staff only
router.get("/", roleMiddleware("admin", "staff"), async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

// Add expense: admin and staff only
router.post("/", roleMiddleware("admin", "staff"), async (req, res) => {
  try {
    const { title, category, amount, date, description } = req.body;

    if (!title || !category || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Title, category and a positive amount are required",
      });
    }

    const expense = await Expense.create({
      title,
      category,
      amount: Number(amount),
      date: date || new Date(),
      description: description || "",
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: "Failed to create expense" });
  }
});

// Delete expense: admin only
router.delete("/:id", roleMiddleware("admin"), async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Failed to delete expense" });
  }
});

module.exports = router;
