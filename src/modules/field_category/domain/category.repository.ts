import { FieldCategory } from "@prisma/client";
import { CategoryDto, UpdateCategoryDto } from "../dto/category.dto";

export interface ICategoryRepository {
    create(category: CategoryDto): Promise<FieldCategory>;
    update(categoryId: string, category: UpdateCategoryDto): Promise<FieldCategory>;
    delete(id: string): Promise<FieldCategory>;
    findById(id: string): Promise<FieldCategory | null>;
    findAll(): Promise<FieldCategory[]>;
}