import { Router } from "express";
import authRouter from "./auth.route";
import categoryRouter from "./field-category.route";

const routers = Router();

routers.use('/auth',authRouter);
routers.use('/category',categoryRouter);

export default routers;