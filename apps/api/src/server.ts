import dotenv from "dotenv";

import { createApp } from "./app";
import { getEnv } from "./config/env";

dotenv.config();

const env = getEnv();
const app = createApp();

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

