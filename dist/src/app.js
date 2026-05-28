"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const passport_1 = __importDefault(require("passport"));
const env_config_1 = require("./config/env.config");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const PORT = env_config_1.Env.PORT || 5000;
app.use(express_1.default.json({ limit: '50mb' }));
app.use((0, cookie_parser_1.default)());
app.use(passport_1.default.initialize());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
});
exports.default = app;
