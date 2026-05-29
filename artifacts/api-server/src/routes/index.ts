import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import invoicesRouter from "./invoices";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(invoicesRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);
router.use(authRouter);

export default router;
