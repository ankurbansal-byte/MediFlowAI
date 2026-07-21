import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import patientRoutes from "./routes/patientRoutes";
import hospitalRoutes from "./routes/hospitalRoutes";
import doctorRoutes from "./routes/doctorRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/webhook", webhookRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/hospital", hospitalRoutes);
app.use("/api/doctor", doctorRoutes);

app.get("/", (req, res) => {
  res.send("🚀 MediFlow AI Backend Running...");
});

export default app;
