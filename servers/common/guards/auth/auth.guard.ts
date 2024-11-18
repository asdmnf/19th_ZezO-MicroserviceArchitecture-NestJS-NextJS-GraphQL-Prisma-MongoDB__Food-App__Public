import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { UserService } from 'apps/users/src/user/user.service';
import { IS_PUBLIC } from 'common/decorators/public/public.decorator';
import { ROLES } from 'common/decorators/roles/roles.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isRoutPublic = this.reflector.get<boolean>(
      IS_PUBLIC,
      context.getHandler(),
    );
    const roles = this.reflector.get<Role[]>(ROLES, context.getHandler());

    if (isRoutPublic) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    const user = await this.userService.verifyLoginTokenAndGetUser(req);

    req.user = user;

    if (roles) {
      if (roles.includes(user.role)) {
        return true;
      } else {
        throw new ForbiddenException(
          'you are not allowed to perform this action',
        );
      }
    }

    return true;
  }
}
