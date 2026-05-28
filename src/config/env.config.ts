import { getEnv } from "../utils/get-env";

export const Env = {
PORT: parseInt(getEnv('PORT', '5000')),
}as const;