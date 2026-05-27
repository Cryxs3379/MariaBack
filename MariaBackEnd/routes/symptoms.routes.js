const express = require("express");
const {
  getSymptoms,
  createSymptom,
  getSymptomById,
  updateSymptom,
  deleteSymptom,
} = require("../controllers/symptoms.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getSymptoms);
router.post("/", createSymptom);
router.get("/:id", getSymptomById);
router.put("/:id", updateSymptom);
router.delete("/:id", deleteSymptom);

module.exports = router;
