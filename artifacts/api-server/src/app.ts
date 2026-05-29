import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./middlewares/auth";
import { db, usersTable } from "@workspace/db";
import { hashPassword } from "./lib/auth-utils";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import path from "node:path";

// Protect API routes with authorization middleware
app.use("/api", requireAuth, router);

// Serve static frontend assets in production
const publicPath = path.resolve(__dirname, "../../pressure-wash/dist/public");
app.use(express.static(publicPath));

// Fallback all other routes to React Router (SPA)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.resolve(publicPath, "index.html"), (err) => {
    if (err) {
      next();
    }
  });
});

// Seed default admin user on startup if users table is empty
async function seedAdminUser() {
  try {
    const existingUsers = await db.select().from(usersTable).limit(1);
    if (existingUsers.length === 0) {
      const hashedPassword = hashPassword("admin123");
      await db.insert(usersTable).values({
        username: "admin",
        password: hashedPassword,
      });
      logger.info("Seeded default admin user (username: admin, password: admin123)");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed default admin user");
  }
}

seedAdminUser();

export default app;
