const express = require("express");
const {
  getPosts,
  createPost,
  getPostById,
  createComment,
  likePost,
  unlikePost,
  deletePost,
  deleteComment,
} = require("../controllers/forum.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/posts", getPosts);
router.post("/posts", createPost);
router.get("/posts/:id", getPostById);
router.post("/posts/:id/comments", createComment);
router.post("/posts/:id/like", likePost);
router.delete("/posts/:id/like", unlikePost);
router.delete("/posts/:id", deletePost);
router.delete("/comments/:id", deleteComment);

module.exports = router;
