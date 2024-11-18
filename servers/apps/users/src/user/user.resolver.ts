import { Resolver, Query, Mutation, Args, Context, Int } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User, UsersWithPagination } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { ParseMongoIdPipe } from 'common/pipes/mongo-id.pipe';
import { ApiFeaturesInput } from 'common/graphql/dto/api-features.input';
import { ParseApiFeaturesInputPipe } from 'common/pipes/parse-api-features-input.pipe';
import { Prisma, Role } from '@prisma/client';
import { ContextType } from 'common/types/context.type';
import { ParseIntPipe } from '@nestjs/common';
import { LoginInput } from './dto/login-user.inputs';
import { ForgetPasswordInput } from './dto/forget-password.inputs';
import { ParseEmailOrPhonePipe } from './pipes/parse-email-or-phone.pipe';
import { ParsePasswordPipe } from './pipes/parse-password.pipe';
import { ChangePasswordInput } from './dto/change-password.inputs';
import { Public } from 'common/decorators/public/public.decorator';
import { Roles } from 'common/decorators/roles/roles.decorator';
import { RequestWithUser } from 'common/types/request-with-user.type';
import { ChangeRoleInput } from './dto/change-role.inputs';
import { ResendLinkInput } from './dto/resend-link.inputs';
import { ForgetPasswordWithResetLinkInput } from './dto/forgetPasswordWithResetLink.inputs';
import { ForgetPasswordResetInput } from './dto/forget-password-reset.Inputs';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Mutation(() => String)
  registerWithActivationCode(
    @Args('createUserInput', ParsePasswordPipe)
    createUserInput: CreateUserInput,
    @Context() context: ContextType,
  ): Promise<string> {
    return this.userService.registerWithActivationCode(
      context.res,
      createUserInput,
    );
  }

  @Public()
  @Mutation(() => String)
  activateAccountOfRegisterWithActivationCode(
    @Args('activationCode', { type: () => Int, nullable: false }, ParseIntPipe)
    activationCode: number,
    @Context() context: ContextType,
  ): Promise<string> {
    return this.userService.activateAccountOfRegisterWithActivationCode(
      context,
      activationCode,
    );
  }

  @Public()
  @Mutation(() => String)
  resendRegistrationActivationCode(
    @Args('createUserInput', ParsePasswordPipe)
    createUserInput: CreateUserInput,
    @Context() context: ContextType,
  ): Promise<string> {
    return this.registerWithActivationCode(createUserInput, context);
  }

  @Public()
  @Mutation(() => String)
  registerWithActivationLink(
    @Args('createUserInput', ParsePasswordPipe)
    createUserInput: CreateUserInput,
  ): Promise<string> {
    return this.userService.registerWithActivationLink(createUserInput);
  }

  @Public()
  @Mutation(() => String)
  activateAccountOfRegisterWithActivationLink(
    @Args('verifyToken', { type: () => String, nullable: false })
    verifyToken: string,
  ): Promise<string> {
    return this.userService.activateAccountOfRegisterWithActivationLink(
      verifyToken,
    );
  }

  @Public()
  @Mutation(() => String)
  resendRegistrationActivationLink(
    @Args('resendActivationLinkInput')
    resendLinkInput: ResendLinkInput,
  ): Promise<string> {
    return this.userService.resendRegistrationActivationLink(resendLinkInput);
  }

  @Public()
  @Mutation(() => User)
  login(
    @Args('loginInput', ParseEmailOrPhonePipe, ParsePasswordPipe)
    loginInput: LoginInput,
    @Context() context: ContextType,
  ): Promise<User> {
    return this.userService.login(context.res, loginInput);
  }

  @Query(() => String)
  logout(@Context() context: ContextType): string {
    return this.userService.logout(context.res);
  }

  @Public()
  @Mutation(() => String)
  forgetPasswordWithResetCode(
    @Args('forgetPasswordResetCodeInput', ParseEmailOrPhonePipe)
    forgetPasswordResetInput: ForgetPasswordResetInput,
    @Context() context: ContextType,
  ): Promise<string> {
    return this.userService.forgetPasswordWithResetCode(
      context.res,
      forgetPasswordResetInput,
    );
  }

  @Public()
  @Mutation(() => String)
  resetOfForgetPasswordWithResetCode(
    @Args('forgetPasswordInput', ParsePasswordPipe)
    forgetPasswordInput: ForgetPasswordInput,
    @Context() context: ContextType,
  ): Promise<string> {
    return this.userService.resetOfForgetPasswordWithResetCode(
      context,
      forgetPasswordInput,
    );
  }

  @Public()
  @Mutation(() => String)
  resendForgetPasswordResetCode(
    @Args('forgetPasswordResetCodeInput', ParseEmailOrPhonePipe)
    forgetPasswordResetInput: ForgetPasswordResetInput,
    @Context() context: ContextType,
  ): Promise<string> {
    return this.forgetPasswordWithResetCode(forgetPasswordResetInput, context);
  }

  @Public()
  @Mutation(() => String)
  forgetPasswordWithResetLink(
    @Args('forgetPasswordResetCodeInput', ParseEmailOrPhonePipe)
    forgetPasswordResetInput: ForgetPasswordResetInput,
  ): Promise<string> {
    return this.userService.forgetPasswordWithResetLink(
      forgetPasswordResetInput,
    );
  }

  @Public()
  @Mutation(() => String)
  resetOfForgetPasswordWithResetLink(
    @Args('forgetPasswordWithResetLinkInput', ParsePasswordPipe)
    forgetPasswordWithResetLinkInput: ForgetPasswordWithResetLinkInput,
  ): Promise<string> {
    return this.userService.resetOfForgetPasswordWithResetLink(
      forgetPasswordWithResetLinkInput,
    );
  }

  @Public()
  @Mutation(() => String)
  resendForgetPasswordResetLink(
    @Args('resendActivationLinkInput')
    resendLinkInput: ResendLinkInput,
  ): Promise<string> {
    return this.userService.resendForgetPasswordResetLink(resendLinkInput);
  }

  @Mutation(() => String)
  changePassword(
    @Args('changePasswordInput', ParsePasswordPipe)
    changePasswordInput: ChangePasswordInput,
    @Context() context: ContextType,
  ): Promise<string> {
    const { req }: { req: RequestWithUser } = context;
    const id = req?.user?.id;
    return this.userService.changePassword(id, changePasswordInput);
  }

  @Roles([Role.ADMIN])
  @Mutation(() => User)
  changeRole(
    @Args('changeRoleInput', ParseMongoIdPipe) changeRoleInput: ChangeRoleInput,
  ): Promise<User> {
    return this.userService.changeRole(changeRoleInput);
  }

  @Query(() => User)
  getMe(@Context() context: ContextType) {
    const { req }: { req: RequestWithUser } = context;
    const { user } = req;
    return user;
  }

  @Roles([Role.ADMIN])
  @Query(() => UsersWithPagination, { name: 'users' })
  findAll(
    @Args(
      'apiFeaturesInput',
      { nullable: true },
      new ParseApiFeaturesInputPipe(Prisma.UserScalarFieldEnum),
    )
    apiFeaturesInput: ApiFeaturesInput,
  ) {
    return this.userService.findAll(apiFeaturesInput);
  }

  @Query(() => User, { name: 'user' })
  findOne(
    @Args('id', { type: () => String }, ParseMongoIdPipe) id: string,
  ): Promise<User> {
    return this.userService.findOne(id);
  }

  @Mutation(() => User)
  updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
  ): Promise<User> {
    return this.userService.update(updateUserInput.id, updateUserInput);
  }

  @Roles([Role.ADMIN])
  @Mutation(() => User)
  removeUser(
    @Args('id', { type: () => String }, ParseMongoIdPipe) id: string,
  ): Promise<User> {
    return this.userService.remove(id);
  }
}
