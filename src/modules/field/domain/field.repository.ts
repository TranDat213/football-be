import { FieldCategory, FootballField, User } from "@prisma/client";
import { FieldDto, UpdateFieldDto } from "../dto/field.dto";

export interface IFieldRepository{
    createField(ownerId: string,data:FieldDto,slug:string):Promise<FootballField>;   
    findByOwnerId(ownerId: string): Promise<FootballField[] | null>;
    findOwner(ownerId: string): Promise<User | null>;
    findCategoryById(categoryId: string): Promise<FieldCategory | null>;
    updateField(fieldId: string,data:UpdateFieldDto,slug?:string):Promise<FootballField>;
    deleteField(fieldId: string):Promise<FootballField>;
    findById(fieldId: string):Promise<FootballField | null>;
}