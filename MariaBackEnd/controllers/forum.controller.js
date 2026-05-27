const pool = require("../config/db");

const getPosts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id,
        p.user_id,
        u.name AS user_name,
        u.email AS user_email,
        p.disease_id,
        d.name AS disease_name,
        p.title,
        p.content,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT c.id) AS comments_count,
        COUNT(DISTINCT l.id) AS likes_count
       FROM forum_posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN diseases d ON d.id = p.disease_id
       LEFT JOIN forum_comments c ON c.post_id = p.id AND c.is_deleted = false
       LEFT JOIN post_likes l ON l.post_id = p.id
       WHERE p.is_deleted = false
       GROUP BY p.id, u.name, u.email, d.name
       ORDER BY p.created_at DESC`
    );

    return res.json({
      posts: result.rows,
    });
  } catch (error) {
    console.error("Error en getPosts:", error);
    return res.status(500).json({
      message: "Error al obtener publicaciones",
    });
  }
};

const createPost = async (req, res) => {
  try {
    const { title, content, disease_id } = req.body;
    const titleValue = typeof title === "string" ? title.trim() : "";
    const contentValue = typeof content === "string" ? content.trim() : "";

    if (!titleValue) {
      return res.status(400).json({
        message: "El titulo es obligatorio",
      });
    }

    if (!contentValue) {
      return res.status(400).json({
        message: "El contenido es obligatorio",
      });
    }

    if (disease_id) {
      const diseaseResult = await pool.query("SELECT id FROM diseases WHERE id = $1", [
        disease_id,
      ]);

      if (diseaseResult.rows.length === 0) {
        return res.status(400).json({
          message: "La enfermedad indicada no existe",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO forum_posts (user_id, disease_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, disease_id, title, content, is_deleted, created_at, updated_at`,
      [req.user.id, disease_id || null, titleValue, contentValue]
    );

    return res.status(201).json({
      message: "Publicacion creada correctamente",
      post: result.rows[0],
    });
  } catch (error) {
    console.error("Error en createPost:", error);
    return res.status(500).json({
      message: "Error al crear publicacion",
    });
  }
};

const getPostById = async (req, res) => {
  try {
    const postResult = await pool.query(
      `SELECT
        p.id,
        p.user_id,
        u.name AS user_name,
        u.email AS user_email,
        p.disease_id,
        d.name AS disease_name,
        p.title,
        p.content,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT c.id) AS comments_count,
        COUNT(DISTINCT l.id) AS likes_count,
        EXISTS (
          SELECT 1
          FROM post_likes ul
          WHERE ul.post_id = p.id AND ul.user_id = $2
        ) AS user_has_liked
       FROM forum_posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN diseases d ON d.id = p.disease_id
       LEFT JOIN forum_comments c ON c.post_id = p.id AND c.is_deleted = false
       LEFT JOIN post_likes l ON l.post_id = p.id
       WHERE p.id = $1 AND p.is_deleted = false
       GROUP BY p.id, u.name, u.email, d.name`,
      [req.params.id, req.user.id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        message: "Publicacion no encontrada",
      });
    }

    const commentsResult = await pool.query(
      `SELECT
        c.id,
        c.post_id,
        c.user_id,
        u.name AS user_name,
        u.email AS user_email,
        c.content,
        c.created_at,
        c.updated_at
       FROM forum_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    return res.json({
      post: postResult.rows[0],
      comments: commentsResult.rows,
    });
  } catch (error) {
    console.error("Error en getPostById:", error);
    return res.status(500).json({
      message: "Error al obtener publicacion",
    });
  }
};

const createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const contentValue = typeof content === "string" ? content.trim() : "";

    if (!contentValue) {
      return res.status(400).json({
        message: "El contenido es obligatorio",
      });
    }

    const postResult = await pool.query(
      "SELECT id FROM forum_posts WHERE id = $1 AND is_deleted = false",
      [req.params.id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        message: "Publicacion no encontrada",
      });
    }

    const result = await pool.query(
      `INSERT INTO forum_comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, is_deleted, created_at, updated_at`,
      [req.params.id, req.user.id, contentValue]
    );

    return res.status(201).json({
      message: "Comentario creado correctamente",
      comment: result.rows[0],
    });
  } catch (error) {
    console.error("Error en createComment:", error);
    return res.status(500).json({
      message: "Error al crear comentario",
    });
  }
};

const likePost = async (req, res) => {
  try {
    const postResult = await pool.query(
      "SELECT id FROM forum_posts WHERE id = $1 AND is_deleted = false",
      [req.params.id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        message: "Publicacion no encontrada",
      });
    }

    await pool.query(
      `INSERT INTO post_likes (post_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING`,
      [req.params.id, req.user.id]
    );

    return res.json({
      message: "Like anadido correctamente",
    });
  } catch (error) {
    console.error("Error en likePost:", error);
    return res.status(500).json({
      message: "Error al anadir like",
    });
  }
};

const unlikePost = async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM post_likes
       WHERE post_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    return res.json({
      message: "Like eliminado correctamente",
    });
  } catch (error) {
    console.error("Error en unlikePost:", error);
    return res.status(500).json({
      message: "Error al eliminar like",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const postResult = await pool.query(
      "SELECT id, user_id, is_deleted FROM forum_posts WHERE id = $1",
      [req.params.id]
    );

    if (postResult.rows.length === 0 || postResult.rows[0].is_deleted) {
      return res.status(404).json({
        message: "Publicacion no encontrada",
      });
    }

    const post = postResult.rows[0];

    if (post.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "No tienes permiso para eliminar esta publicacion",
      });
    }

    await pool.query(
      `UPDATE forum_posts
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id]
    );

    return res.json({
      message: "Publicacion eliminada correctamente",
    });
  } catch (error) {
    console.error("Error en deletePost:", error);
    return res.status(500).json({
      message: "Error al eliminar publicacion",
    });
  }
};

const deleteComment = async (req, res) => {
  try {
    const commentResult = await pool.query(
      "SELECT id, user_id, is_deleted FROM forum_comments WHERE id = $1",
      [req.params.id]
    );

    if (commentResult.rows.length === 0 || commentResult.rows[0].is_deleted) {
      return res.status(404).json({
        message: "Comentario no encontrado",
      });
    }

    const comment = commentResult.rows[0];

    if (comment.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "No tienes permiso para eliminar este comentario",
      });
    }

    await pool.query(
      `UPDATE forum_comments
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id]
    );

    return res.json({
      message: "Comentario eliminado correctamente",
    });
  } catch (error) {
    console.error("Error en deleteComment:", error);
    return res.status(500).json({
      message: "Error al eliminar comentario",
    });
  }
};

module.exports = {
  getPosts,
  createPost,
  getPostById,
  createComment,
  likePost,
  unlikePost,
  deletePost,
  deleteComment,
};
