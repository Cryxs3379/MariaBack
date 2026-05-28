const express = require("express");
const {
  getTodayCheckin,
  createCheckin,
  getCheckins,
  getCheckinByDate,
  updateCheckin,
  deleteCheckin,
} = require("../controllers/checkins.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/today", authMiddleware, getTodayCheckin);
router.post("/", authMiddleware, createCheckin);
router.get("/", authMiddleware, getCheckins);
router.get("/:date", authMiddleware, getCheckinByDate);
router.put("/:id", authMiddleware, updateCheckin);
router.delete("/:id", authMiddleware, deleteCheckin);

module.exports = router;
