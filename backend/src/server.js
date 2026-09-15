import dotenv from "dotenv";
import app from "./app.js";
import { runDataRepairs } from "./config/dataRepairs.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running on port ${PORT}`);
  await runDataRepairs();
});