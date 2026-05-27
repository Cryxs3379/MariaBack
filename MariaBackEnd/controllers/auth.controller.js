const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Nombre, email y contrasena son obligatorios",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Ya existe un usuario con ese email",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_verified, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, is_verified, status, created_at, updated_at`,
      [name, email, passwordHash, "user", false, "active"]
    );

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      user: newUser.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al registrar el usuario",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contrasena son obligatorios",
      });
    }

    const userResult = await pool.query(
      `SELECT id, name, email, password_hash, role, is_verified, status, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        message: "Credenciales incorrectas",
      });
    }

    const user = userResult.rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        message: "El usuario no esta activo",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Credenciales incorrectas",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
      },
      process.env.JWT_SECRET
    );

    const { password_hash, ...userWithoutPassword } = user;

    return res.json({
      message: "Login correcto",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al iniciar sesion",
    });
  }
};

module.exports = {
  register,
  login,
};
