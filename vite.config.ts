import { defineConfig } from "vite";

const devToken =
  "AvMV7+QuKgPxuDvjlFx3+twwSmQTXtOiBWJxkIz/C0SdqdDbaYdk6fYULy2nZgs6uu0+ymOmQnAoJDI5JKFfNAoAAABJeyJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJmZWF0dXJlIjoiV2ViR1BVIiwiZXhwaXJ5IjoxNjkxNzExOTk5fQ==";

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
