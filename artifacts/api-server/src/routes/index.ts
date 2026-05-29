import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import invoicesRouter from "./invoices";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(invoicesRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);

export default router;
