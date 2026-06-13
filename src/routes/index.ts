import { Router } from 'express';
import authRouter from './auth.route';
import categoryRouter from './field-category.route';
import fieldRouter from './field.route';
import subfieldRouter from './subfield.route';

const routers = Router();

routers.use('/auth', authRouter);
routers.use('/category', categoryRouter);
routers.use('/field', fieldRouter);
routers.use('/subfield', subfieldRouter);
export default routers;
