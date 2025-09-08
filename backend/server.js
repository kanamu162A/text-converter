import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import conversionsRoutes from "./routes/binaryRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import master_keyRoutes from "./routes/masterKeyRoutes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));

});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.use("/api/shatova/v2/auth", authRoutes);
app.use("/api/shatova/v2/admin", adminRoutes);
app.use("/api/shatova/v2/conversions", conversionsRoutes);
app.use("/api/shatova/v2/dashboard", dashboardRoutes);
app.use("/api/shatova/v2/", master_keyRoutes);



const PORT = 8080;
app.listen(PORT, () =>
  console.log(`🚀 Shatova V2 running on http://localhost:${PORT}`)
);
