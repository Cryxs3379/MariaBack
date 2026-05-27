const pool = require("../config/db");

const getSymptoms = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, symptom_name, intensity, notes, logged_at, created_at
       FROM symptom_logs
       WHERE user_id = $1
       ORDER BY logged_at DESC`,
      [req.user.id]
    );

    return res.json({
      symptoms: result.rows,
    });
  } catch (error) {
    console.error("Error en getSymptoms:", error);
    return res.status(500).json({
      message: "Error al obtener sintomas",
    });
  }
};

const createSymptom = async (req, res) => {
  try {
    const { symptom_name, intensity, notes, logged_at } = req.body;
    const symptomName = typeof symptom_name === "string" ? symptom_name.trim() : "";
    const intensityNumber = Number(intensity);

    if (!symptomName) {
      return res.status(400).json({
        message: "El nombre del sintoma es obligatorio",
      });
    }

    if (!Number.isInteger(intensityNumber) || intensityNumber < 1 || intensityNumber > 10) {
      return res.status(400).json({
        message: "La intensidad debe ser un numero entre 1 y 10",
      });
    }

    const notesValue = typeof notes === "string" ? notes.trim() : notes || null;
    let result;

    if (logged_at) {
      result = await pool.query(
        `INSERT INTO symptom_logs (user_id, symptom_name, intensity, notes, logged_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, symptom_name, intensity, notes, logged_at, created_at`,
        [req.user.id, symptomName, intensityNumber, notesValue, logged_at]
      );
    } else {
      result = await pool.query(
        `INSERT INTO symptom_logs (user_id, symptom_name, intensity, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, symptom_name, intensity, notes, logged_at, created_at`,
        [req.user.id, symptomName, intensityNumber, notesValue]
      );
    }

    return res.status(201).json({
      message: "Sintoma creado correctamente",
      symptom: result.rows[0],
    });
  } catch (error) {
    console.error("Error en createSymptom:", error);
    return res.status(500).json({
      message: "Error al crear sintoma",
    });
  }
};

const getSymptomById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, symptom_name, intensity, notes, logged_at, created_at
       FROM symptom_logs
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Sintoma no encontrado",
      });
    }

    return res.json({
      symptom: result.rows[0],
    });
  } catch (error) {
    console.error("Error en getSymptomById:", error);
    return res.status(500).json({
      message: "Error al obtener sintoma",
    });
  }
};

const updateSymptom = async (req, res) => {
  try {
    const { symptom_name, intensity, notes, logged_at } = req.body;
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (symptom_name !== undefined) {
      const symptomName = typeof symptom_name === "string" ? symptom_name.trim() : "";

      if (!symptomName) {
        return res.status(400).json({
          message: "El nombre del sintoma no puede estar vacio",
        });
      }

      fields.push(`symptom_name = $${paramIndex}`);
      values.push(symptomName);
      paramIndex += 1;
    }

    if (intensity !== undefined) {
      const intensityNumber = Number(intensity);

      if (!Number.isInteger(intensityNumber) || intensityNumber < 1 || intensityNumber > 10) {
        return res.status(400).json({
          message: "La intensidad debe ser un numero entre 1 y 10",
        });
      }

      fields.push(`intensity = $${paramIndex}`);
      values.push(intensityNumber);
      paramIndex += 1;
    }

    if (notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(typeof notes === "string" ? notes.trim() : notes);
      paramIndex += 1;
    }

    if (logged_at !== undefined) {
      fields.push(`logged_at = $${paramIndex}`);
      values.push(logged_at);
      paramIndex += 1;
    }

    if (fields.length === 0) {
      return res.status(400).json({
        message: "No hay campos para actualizar",
      });
    }

    values.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE symptom_logs
       SET ${fields.join(", ")}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, user_id, symptom_name, intensity, notes, logged_at, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Sintoma no encontrado",
      });
    }

    return res.json({
      message: "Sintoma actualizado correctamente",
      symptom: result.rows[0],
    });
  } catch (error) {
    console.error("Error en updateSymptom:", error);
    return res.status(500).json({
      message: "Error al actualizar sintoma",
    });
  }
};

const deleteSymptom = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM symptom_logs
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Sintoma no encontrado",
      });
    }

    return res.json({
      message: "Sintoma eliminado correctamente",
    });
  } catch (error) {
    console.error("Error en deleteSymptom:", error);
    return res.status(500).json({
      message: "Error al eliminar sintoma",
    });
  }
};

module.exports = {
  getSymptoms,
  createSymptom,
  getSymptomById,
  updateSymptom,
  deleteSymptom,
};
