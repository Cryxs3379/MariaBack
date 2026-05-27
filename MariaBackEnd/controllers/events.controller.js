const pool = require("../config/db");

const VALID_EVENT_TYPES = ["general", "medical", "medication", "symptom", "reminder"];

const getEvents = async (req, res) => {
  try {
    const { from, to } = req.query;
    let result;

    if (from && to) {
      result = await pool.query(
        `SELECT id, user_id, title, description, event_type, start_date, end_date, created_at, updated_at
         FROM calendar_events
         WHERE user_id = $1 AND start_date BETWEEN $2 AND $3
         ORDER BY start_date ASC`,
        [req.user.id, from, to]
      );
    } else {
      result = await pool.query(
        `SELECT id, user_id, title, description, event_type, start_date, end_date, created_at, updated_at
         FROM calendar_events
         WHERE user_id = $1
         ORDER BY start_date ASC`,
        [req.user.id]
      );
    }

    return res.json({
      events: result.rows,
    });
  } catch (error) {
    console.error("Error en getEvents:", error);
    return res.status(500).json({
      message: "Error al obtener eventos",
    });
  }
};

const createEvent = async (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date } = req.body;
    const titleValue = typeof title === "string" ? title.trim() : "";
    const eventType = event_type || "general";

    if (!titleValue) {
      return res.status(400).json({
        message: "El titulo es obligatorio",
      });
    }

    if (!start_date) {
      return res.status(400).json({
        message: "La fecha de inicio es obligatoria",
      });
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        message: "El tipo de evento no es valido",
      });
    }

    const result = await pool.query(
      `INSERT INTO calendar_events (user_id, title, description, event_type, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, title, description, event_type, start_date, end_date, created_at, updated_at`,
      [
        req.user.id,
        titleValue,
        typeof description === "string" ? description.trim() : description || null,
        eventType,
        start_date,
        end_date || null,
      ]
    );

    return res.status(201).json({
      message: "Evento creado correctamente",
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Error en createEvent:", error);
    return res.status(500).json({
      message: "Error al crear evento",
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, title, description, event_type, start_date, end_date, created_at, updated_at
       FROM calendar_events
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Evento no encontrado",
      });
    }

    return res.json({
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Error en getEventById:", error);
    return res.status(500).json({
      message: "Error al obtener evento",
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date } = req.body;
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      const titleValue = typeof title === "string" ? title.trim() : "";

      if (!titleValue) {
        return res.status(400).json({
          message: "El titulo no puede estar vacio",
        });
      }

      fields.push(`title = $${paramIndex}`);
      values.push(titleValue);
      paramIndex += 1;
    }

    if (description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(typeof description === "string" ? description.trim() : description);
      paramIndex += 1;
    }

    if (event_type !== undefined) {
      if (!VALID_EVENT_TYPES.includes(event_type)) {
        return res.status(400).json({
          message: "El tipo de evento no es valido",
        });
      }

      fields.push(`event_type = $${paramIndex}`);
      values.push(event_type);
      paramIndex += 1;
    }

    if (start_date !== undefined) {
      if (!start_date) {
        return res.status(400).json({
          message: "La fecha de inicio no puede estar vacia",
        });
      }

      fields.push(`start_date = $${paramIndex}`);
      values.push(start_date);
      paramIndex += 1;
    }

    if (end_date !== undefined) {
      fields.push(`end_date = $${paramIndex}`);
      values.push(end_date);
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
      `UPDATE calendar_events
       SET ${fields.join(", ")}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, user_id, title, description, event_type, start_date, end_date, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Evento no encontrado",
      });
    }

    return res.json({
      message: "Evento actualizado correctamente",
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Error en updateEvent:", error);
    return res.status(500).json({
      message: "Error al actualizar evento",
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM calendar_events
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Evento no encontrado",
      });
    }

    return res.json({
      message: "Evento eliminado correctamente",
    });
  } catch (error) {
    console.error("Error en deleteEvent:", error);
    return res.status(500).json({
      message: "Error al eliminar evento",
    });
  }
};

module.exports = {
  getEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
};
