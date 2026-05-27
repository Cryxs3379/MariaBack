const pool = require("../config/db");

const getMe = async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, name, email, role, is_verified, status, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.json({
      user: userResult.rows[0],
    });
  } catch (error) {
    console.error("Error en getMe:", error);
    return res.status(500).json({
      message: "Error al obtener el usuario",
    });
  }
};

module.exports = {
  getMe,
};
