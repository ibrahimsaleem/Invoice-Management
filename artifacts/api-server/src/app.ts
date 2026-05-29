import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./middlewares/auth";
import { db, usersTable } from "@workspace/db";
import { hashPassword } from "./lib/auth-utils";
import { eq } from "drizzle-orm";

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
app.get("*splat", (req, res, next) => {
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
    // 1. Remove the old default 'admin' user if they exist
    await db.delete(usersTable).where(eq(usersTable.username, "admin"));

    // 2. Insert or update the new 'admin-ibrahim' user with password 'Password@admin786'
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.username, "admin-ibrahim")).limit(1);
    const hashedPassword = hashPassword("Password@admin786");
    if (existingUser.length === 0) {
      await db.insert(usersTable).values({
        username: "admin-ibrahim",
        password: hashedPassword,
      });
      logger.info("Seeded admin user (username: admin-ibrahim)");
    } else {
      await db.update(usersTable)
        .set({ password: hashedPassword })
        .where(eq(usersTable.username, "admin-ibrahim"));
      logger.info("Updated admin-ibrahim user credentials");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed default admin user");
  }
}

seedAdminUser();

export default app;
