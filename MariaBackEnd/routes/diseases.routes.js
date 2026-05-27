const express = require("express");
const { getDiseases } = require("../controllers/diseases.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getDiseases);

module.exports = router;
