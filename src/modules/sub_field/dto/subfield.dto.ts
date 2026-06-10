import { YardStatus, YardType } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";

export class FieldYardDto{
    @IsString()
    name!: string;

    @IsString()
    field_id!: string;

    @IsString()
    @IsEnum(YardType)
    type!: YardType;

    @IsString()
    @IsEnum(YardStatus)
    status!: YardStatus;
}