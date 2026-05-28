"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = void 0;
const getEnv = (key, defaultValue) => {
    const val = process.env[key] ?? defaultValue;
    if (!val)
        throw new Error(`Environment variable ${key} is not set`);
    return val;
};
exports.getEnv = getEnv;
