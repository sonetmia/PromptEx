import express from "express";
import { registerAuthRoutes } from "../../auth.ts";

const app = express();
app.use(express.json({ limit: "1mb" }));
registerAuthRoutes(app);

export default app;
