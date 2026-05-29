import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export interface AuthenticatedRequest extends Request {
  user?: typeof usersTable.$inferSelect;
}

function isPublicPath(path: string): boolean {
  const normalized = path.replace(/\/$/, "");
  return (
    normalized === "/healthz" ||
    normalized === "/api/healthz" ||
    normalized === "/auth/login" ||
    normalized === "/api/auth/login" ||
    normalized === "/auth/logout" ||
    normalized === "/api/auth/logout"
  );
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userIdStr = req.signedCookies.session;

  if (userIdStr) {
    const userId = Number(userIdStr);
    if (!Number.isNaN(userId)) {
      try {
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, userId));

        if (user) {
          req.user = user;
        }
      } catch (err) {
        req.log?.error({ err }, "Error fetching user in requireAuth");
      }
    }
  }

  // If user is authenticated, let them through
  if (req.user) {
    return next();
  }

  // If path is public, let them through (even without authentication)
  if (isPublicPath(req.path) || isPublicPath(req.originalUrl)) {
    return next();
  }

  // Otherwise, block with 401 Unauthorized
  res.status(401).json({ error: "Unauthorized: Access Denied" });
}
