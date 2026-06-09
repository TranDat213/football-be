import { Router } from "express";
import authRouter from "./auth.route";
import categoryRouter from "./field-category.route";
import fieldRouter from "./field.route";

const routers = Router();

routers.use('/auth', authRouter);
routers.use('/category', categoryRouter);
routers.use('/field', fieldRouter);

export default routers;