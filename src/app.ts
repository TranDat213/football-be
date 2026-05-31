
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from "passport";
import { Env } from './config/env.config';

const app = express();

app.use(cors())

const PORT = Env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));

app.use(cookieParser());

app.use(passport.initialize());

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;