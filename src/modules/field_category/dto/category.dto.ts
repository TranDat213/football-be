import { IsInt, IsString } from "class-validator";

export class CategoryDto {
    @IsString()
    name!:string;
    
    @IsInt()
    display_order!:number;
}

export class UpdateCategoryDto {
    
    @IsString()
    name!:string;
    
    @IsInt()
    display_order!:number;
}
