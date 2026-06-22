import { Router } from 'express';
import authRouter from './auth.route';
import categoryRouter from './field-category.route';
import fieldRouter from './field.route';
import subfieldRouter from './subfield.route';
import userRouter from './user.route';
import bookingRouter from './booking.route';
import paymentRouter from './payment.route';
import settlementRouter from './settlement.route';

const routers = Router();

routers.use('/auth', authRouter);
routers.use('/category', categoryRouter);
routers.use('/field', fieldRouter);
routers.use('/subfield', subfieldRouter);
routers.use('/user', userRouter);
routers.use('/bookings', bookingRouter);
routers.use('/payments', paymentRouter);
routers.use('/settlements', settlementRouter);
export default routers;
