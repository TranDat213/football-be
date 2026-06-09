import prisma from "@/lib/prisma";
import { asyncHandler } from "@/middleware/async-handler.middleware";
import { authenticate } from "@/middleware/authenticate.middleware";
import { authorize } from "@/middleware/authorize.middlerware";
import { validateDto } from "@/middleware/validate-dto.middleware";
import { FieldController } from "@/modules/field/application/field.controller";
import { FieldService } from "@/modules/field/application/field.service";
import { FieldDto, UpdateFieldDto } from "@/modules/field/dto/field.dto";
import { PrismaFieldRepository } from "@/modules/field/infrastructure/prisma-field.repository";
import { UserRole } from "@prisma/client";
import { Router } from "express";

const fieldRouter = Router();
const fieldRepository = new PrismaFieldRepository(prisma);
const fieldService = new FieldService(fieldRepository);
const fieldController = new FieldController(fieldService);

fieldRouter.use(authenticate)
fieldRouter.post('/create',authorize(UserRole.OWNER),validateDto(FieldDto),asyncHandler(fieldController.createField.bind(fieldController)));
fieldRouter.put('/:id',authorize(UserRole.OWNER),validateDto(UpdateFieldDto),asyncHandler(fieldController.updateField.bind(fieldController)));
fieldRouter.delete('/:id',authorize(UserRole.OWNER,UserRole.ADMIN),asyncHandler(fieldController.deleteField.bind(fieldController)));
fieldRouter.get('/find/:id',authorize(UserRole.OWNER,UserRole.ADMIN),asyncHandler(fieldController.findById.bind(fieldController)));

export default fieldRouter;