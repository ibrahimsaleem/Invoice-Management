import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { verifyPassword } from "../lib/auth-utils";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { LoginBody, LoginResponse, GetAuthMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (!user || !verifyPassword(password, user.password)) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    res.cookie("session", user.id.toString(), {
      signed: true,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const responseData = {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
    };

    res.json(LoginResponse.parse(responseData));
  } catch (err) {
    req.log?.error({ err }, "Error in login route");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("session");
  res.sendStatus(204);
});

router.get("/auth/me", (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const responseData = {
    id: req.user.id,
    username: req.user.username,
    createdAt: req.user.createdAt.toISOString(),
  };

  res.json(GetAuthMeResponse.parse(responseData));
});

export default router;
