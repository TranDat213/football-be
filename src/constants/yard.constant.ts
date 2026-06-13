import { YardType } from "@prisma/client";

export const YARD_CODE_PREFIX: Record<YardType, string> = {
    [YardType.FIVE_A_SIDE]: "S5",
    [YardType.SEVEN_A_SIDE]: "S7",
    [YardType.ELEVEN_A_SIDE]: "S11",
}