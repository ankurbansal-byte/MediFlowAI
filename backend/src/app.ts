import express from "express";
import cors from "cors";

import webhookRoutes from "./routes/webhookRoutes";
import patientRoutes from "./routes/patientRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/webhook", webhookRoutes);
app.use("/api/patient", patientRoutes);

app.get("/", (req, res) => {
  res.send("🚀 MediFlow AI Backend Running...");
});

export default app;