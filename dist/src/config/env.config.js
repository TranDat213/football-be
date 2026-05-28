"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Env = void 0;
const get_env_1 = require("../utils/get-env");
exports.Env = {
    PORT: parseInt((0, get_env_1.getEnv)('PORT', '5000')),
};
