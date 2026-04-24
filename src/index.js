require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const studentRoutes = require("./routes/students");
const attendanceRoutes = require("./routes/attendance");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/dashboard", express.static(path.join(__dirname, "../frontend")));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Smart attendance backend is running."
  });
});

app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

app.listen(port,'0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});
