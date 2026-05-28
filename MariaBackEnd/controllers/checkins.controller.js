const pool = require("../config/db");

const CHECKIN_FIELDS = `
  id,
  user_id,
  checkin_date,
  general_feeling,
  pain_level,
  energy_level,
  mood,
  sleep_hours,
  symptoms_today,
  personal_notes,
  created_at,
  updated_at
`;

const isValidDateString = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isNumberBetween = (value, min, max) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
};

const getTodayCheckin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CHECKIN_FIELDS}
       FROM daily_checkins
       WHERE user_id = $1 AND checkin_date = CURRENT_DATE`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        hasCheckinToday: false,
        checkin: null,
      });
    }

    return res.json({
      hasCheckinToday: true,
      checkin: result.rows[0],
    });
  } catch (error) {
    console.error("Error en getTodayCheckin:", error);
    return res.status(500).json({
      message: "Error al obtener el chequeo diario de hoy",
    });
  }
};

const createCheckin = async (req, res) => {
  try {
    const {
      checkin_date,
      general_feeling,
      pain_level,
      energy_level,
      mood,
      sleep_hours,
      symptoms_today,
      personal_notes,
    } = req.body;

    if (checkin_date && !isValidDateString(checkin_date)) {
      return res.status(400).json({
        message: "La fecha del chequeo debe tener formato YYYY-MM-DD",
      });
    }

    if (pain_level === undefined || pain_level === null || !isNumberBetween(pain_level, 0, 10)) {
      return res.status(400).json({
        message: "El nivel de dolor debe estar entre 0 y 10",
      });
    }

    if (
      energy_level === undefined ||
      energy_level === null ||
      !isNumberBetween(energy_level, 0, 10)
    ) {
      return res.status(400).json({
        message: "El nivel de energia debe estar entre 0 y 10",
      });
    }

    if (sleep_hours !== undefined && sleep_hours !== null && !isNumberBetween(sleep_hours, 0, 24)) {
      return res.status(400).json({
        message: "Las horas de sueno deben estar entre 0 y 24",
      });
    }

    const existingCheckin = await pool.query(
      `SELECT id
       FROM daily_checkins
       WHERE user_id = $1 AND checkin_date = COALESCE($2::date, CURRENT_DATE)`,
      [req.user.id, checkin_date || null]
    );

    if (existingCheckin.rows.length > 0) {
      return res.status(409).json({
        message: "Ya existe un chequeo para esta fecha",
      });
    }

    const result = await pool.query(
      `INSERT INTO daily_checkins (
        user_id,
        checkin_date,
        general_feeling,
        pain_level,
        energy_level,
        mood,
        sleep_hours,
        symptoms_today,
        personal_notes
      )
      VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${CHECKIN_FIELDS}`,
      [
        req.user.id,
        checkin_date || null,
        normalizeOptionalString(general_feeling),
        Number(pain_level),
        Number(energy_level),
        normalizeOptionalString(mood),
        sleep_hours === undefined || sleep_hours === null ? null : Number(sleep_hours),
        normalizeOptionalString(symptoms_today),
        normalizeOptionalString(personal_notes),
      ]
    );

    return res.status(201).json({
      message: "Chequeo diario creado correctamente",
      checkin: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Ya existe un chequeo para esta fecha",
      });
    }

    console.error("Error en createCheckin:", error);
    return res.status(500).json({
      message: "Error al crear chequeo diario",
    });
  }
};

const getCheckins = async (req, res) => {
  try {
    const { from, to } = req.query;
    let result;

    if ((from && !isValidDateString(from)) || (to && !isValidDateString(to))) {
      return res.status(400).json({
        message: "Las fechas deben tener formato YYYY-MM-DD",
      });
    }

    if (from && to) {
      result = await pool.query(
        `SELECT ${CHECKIN_FIELDS}
         FROM daily_checkins
         WHERE user_id = $1 AND checkin_date BETWEEN $2 AND $3
         ORDER BY checkin_date DESC`,
        [req.user.id, from, to]
      );
    } else {
      result = await pool.query(
        `SELECT ${CHECKIN_FIELDS}
         FROM daily_checkins
         WHERE user_id = $1
         ORDER BY checkin_date DESC`,
        [req.user.id]
      );
    }

    return res.json({
      checkins: result.rows,
    });
  } catch (error) {
    console.error("Error en getCheckins:", error);
    return res.status(500).json({
      message: "Error al obtener chequeos diarios",
    });
  }
};

const getCheckinByDate = async (req, res) => {
  try {
    const { date } = req.params;

    if (!isValidDateString(date)) {
      return res.status(400).json({
        message: "La fecha debe tener formato YYYY-MM-DD",
      });
    }

    const result = await pool.query(
      `SELECT ${CHECKIN_FIELDS}
       FROM daily_checkins
       WHERE user_id = $1 AND checkin_date = $2`,
      [req.user.id, date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Chequeo no encontrado",
      });
    }

    return res.json({
      checkin: result.rows[0],
    });
  } catch (error) {
    console.error("Error en getCheckinByDate:", error);
    return res.status(500).json({
      message: "Error al obtener chequeo diario",
    });
  }
};

const updateCheckin = async (req, res) => {
  try {
    const {
      general_feeling,
      pain_level,
      energy_level,
      mood,
      sleep_hours,
      symptoms_today,
      personal_notes,
    } = req.body;
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (general_feeling !== undefined) {
      fields.push(`general_feeling = $${paramIndex}`);
      values.push(normalizeOptionalString(general_feeling));
      paramIndex += 1;
    }

    if (pain_level !== undefined) {
      if (pain_level === null || !isNumberBetween(pain_level, 0, 10)) {
        return res.status(400).json({
          message: "El nivel de dolor debe estar entre 0 y 10",
        });
      }

      fields.push(`pain_level = $${paramIndex}`);
      values.push(Number(pain_level));
      paramIndex += 1;
    }

    if (energy_level !== undefined) {
      if (energy_level === null || !isNumberBetween(energy_level, 0, 10)) {
        return res.status(400).json({
          message: "El nivel de energia debe estar entre 0 y 10",
        });
      }

      fields.push(`energy_level = $${paramIndex}`);
      values.push(Number(energy_level));
      paramIndex += 1;
    }

    if (mood !== undefined) {
      fields.push(`mood = $${paramIndex}`);
      values.push(normalizeOptionalString(mood));
      paramIndex += 1;
    }

    if (sleep_hours !== undefined) {
      if (sleep_hours !== null && !isNumberBetween(sleep_hours, 0, 24)) {
        return res.status(400).json({
          message: "Las horas de sueno deben estar entre 0 y 24",
        });
      }

      fields.push(`sleep_hours = $${paramIndex}`);
      values.push(sleep_hours === null ? null : Number(sleep_hours));
      paramIndex += 1;
    }

    if (symptoms_today !== undefined) {
      fields.push(`symptoms_today = $${paramIndex}`);
      values.push(normalizeOptionalString(symptoms_today));
      paramIndex += 1;
    }

    if (personal_notes !== undefined) {
      fields.push(`personal_notes = $${paramIndex}`);
      values.push(normalizeOptionalString(personal_notes));
      paramIndex += 1;
    }

    if (fields.length === 0) {
      return res.status(400).json({
        message: "No hay campos para actualizar",
      });
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE daily_checkins
       SET ${fields.join(", ")}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING ${CHECKIN_FIELDS}`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Chequeo no encontrado",
      });
    }

    return res.json({
      message: "Chequeo diario actualizado correctamente",
      checkin: result.rows[0],
    });
  } catch (error) {
    console.error("Error en updateCheckin:", error);
    return res.status(500).json({
      message: "Error al actualizar chequeo diario",
    });
  }
};

const deleteCheckin = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM daily_checkins
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Chequeo no encontrado",
      });
    }

    return res.json({
      message: "Chequeo diario eliminado correctamente",
    });
  } catch (error) {
    console.error("Error en deleteCheckin:", error);
    return res.status(500).json({
      message: "Error al eliminar chequeo diario",
    });
  }
};

module.exports = {
  getTodayCheckin,
  createCheckin,
  getCheckins,
  getCheckinByDate,
  updateCheckin,
  deleteCheckin,
};
