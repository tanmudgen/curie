import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roomsRouter from "./rooms";
import questionsRouter from "./questions";
import taRouter from "./ta";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roomsRouter);
router.use(questionsRouter);
router.use(taRouter);

export default router;
