require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Backend de MariaBackEnd funcionando correctamente",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MariaBackEnd",
    database: "autoimmune_app",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

app.listen(PORT, () => {
  console.log(`MariaBackEnd escuchando en http://localhost:${PORT}`);
});
