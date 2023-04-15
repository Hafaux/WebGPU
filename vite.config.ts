import { defineConfig } from "vite";
import * as dotenv from "dotenv";

dotenv.config();

const devToken = process.env.ORIGIN_TRIAL_TOKEN || "";
console.warn(devToken);

export default defineConfig({
  server: {
    port: 8080,
    host: true,
  },
  plugins: [
    {
      name: "Origin-Trial",
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Origin-Trial", devToken);
          next();
        });
      },
    },
  ],
});
