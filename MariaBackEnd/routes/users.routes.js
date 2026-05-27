const express = require("express");
const { getMe } = require("../controllers/users.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", authMiddleware, getMe);

module.exports = router;
