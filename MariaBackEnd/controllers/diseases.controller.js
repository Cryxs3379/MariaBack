const pool = require("../config/db");

const getDiseases = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, created_at
       FROM diseases
       ORDER BY name ASC`
    );

    return res.json({
      diseases: result.rows,
    });
  } catch (error) {
    console.error("Error en getDiseases:", error);
    return res.status(500).json({
      message: "Error al obtener enfermedades",
    });
  }
};

module.exports = {
  getDiseases,
};
