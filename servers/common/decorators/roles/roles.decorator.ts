import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES = 'ROLES';
export const Roles = (roles: Role[]) => SetMetadata(ROLES, roles);
