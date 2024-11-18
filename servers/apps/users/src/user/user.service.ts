import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { PrismaService } from '../../../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { ApiFeaturesInput } from 'common/graphql/dto/api-features.input';
import { Prisma, PrismaClient, User } from '@prisma/client';
import { HandlersFactoryService } from 'common/services/handlers-factory/handlers-factory.service';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'common/types/environment-variables.type';
import { Request, Response } from 'express';
import { ContextType } from 'common/types/context.type';
import { CacheManagerService } from 'common/services/cache-manager.service';
import { LoginInput } from './dto/login-user.inputs';
import { ChangePasswordInput } from './dto/change-password.inputs';
import { ForgetPasswordInput } from './dto/forget-password.inputs';
import * as ms from 'ms';
import { ChangeRoleInput } from './dto/change-role.inputs';
import { ForgetPasswordWithResetLinkInput } from './dto/forgetPasswordWithResetLink.inputs';
import { ResendLinkInput } from './dto/resend-link.inputs';
import { ForgetPasswordResetInput } from './dto/forget-password-reset.Inputs';

@Injectable()
export class UserService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly prisma: PrismaService,
    private readonly handlersFactoryService: HandlersFactoryService,
    private readonly mailerService: MailerService,
    private readonly jWTService: JwtService,
    private readonly cacheManager: CacheManagerService,
  ) {}

  private readonly prismaModel: PrismaClient['user'] = this.prisma.user;
  private readonly cacheKey: string = 'user';

  async registerWithActivationCode(
    res: Response,
    createUserInput: CreateUserInput,
  ): Promise<string> {
    const { email, phoneNumber, password } = createUserInput;
    const cacheKeyToCheckIfUserReceivedCodeBefore = `register-code:${email}`;

    const isUserReceivedCodeBefore = await this.cacheManager.get(
      cacheKeyToCheckIfUserReceivedCodeBefore,
    );
    if (isUserReceivedCodeBefore) {
      return `'Activation Code already sent to your email, wait ${ms(Number(this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS')))} to get another code'`;
    }

    const isUserExists = await this.handlersFactoryService.getOneByField<
      Prisma.UserWhereInput,
      Prisma.UserInclude
    >(
      this.prismaModel,
      { OR: [{ email }, { phoneNumber }] },
      true,
    );
    if (isUserExists) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = { ...createUserInput, password: hashedPassword };

    const { code, token } = await this.createCodeAndToken(user);

    await this.mailerService.sendMail({
      to: 'egypte.2200@gmail.com',
      subject: 'Welcome to our service! Confirm your Email',
      template: './activation-mail',
      context: {
        name: user.name,
        activationCode: code,
      },
    });

    res.cookie(this.configService.get('COOKIE_ACTIVATION_TOKEN_NAME'), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ms(this.configService.get('JWT_CODES_EXPIRES_IN')),
    });

    await this.cacheManager.set(
      cacheKeyToCheckIfUserReceivedCodeBefore,
      email,
      this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS'),
    );

    return `Check your email address, and submit the activation code that is valid for 10 minutes form now`;
  }

  async activateAccountOfRegisterWithActivationCode(
    context: ContextType,
    activationCode: number,
  ): Promise<string> {
    const { req, res } = context;
    const token = this.getTokenFromRequest(
      req,
      this.configService.get('COOKIE_ACTIVATION_TOKEN_NAME'),
      'no token provided, go to login or register to get an activation code',
    );

    const payload: { code: number; user: CreateUserInput } =
      await this.jWTService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

    if (!payload.code || activationCode !== payload.code) {
      throw new UnauthorizedException('Invalid or Expired activation code');
    }

    await this.handlersFactoryService.create<Prisma.UserCreateArgs>(
      this.prismaModel,
      { data: payload.user },
      this.cacheKey,
    );

    res.clearCookie(this.configService.get('COOKIE_ACTIVATION_TOKEN_NAME'));

    return 'user created successfully';
  }

  async registerWithActivationLink(
    createUserInput: CreateUserInput,
  ): Promise<string> {
    const { email, phoneNumber, password } = createUserInput;
    const registerUniqueCacheKey = `register-user-link:${email}`;

    const isUserReceivedActivationEmail = await this.cacheManager.get(
      registerUniqueCacheKey,
    );
    if (isUserReceivedActivationEmail) {
      throw new ForbiddenException(
        'Activation Link has been already sent to you email, check you email right now',
      );
    }

    const isUserExists = await this.handlersFactoryService.getOneByField<
      Prisma.UserWhereInput,
      Prisma.UserInclude
    >(
      this.prismaModel,
      { OR: [{ email }, { phoneNumber }] },
      true,
    );
    if (isUserExists) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = { ...createUserInput, password: hashedPassword };

    const token = await this.generateToken(
      { email: user.email },
      this.configService.get('JWT_LINKS_EXPIRES_IN'),
    );

    const activationLink = `${this.configService.get('CLIENT_URL')}${this.configService.get('CLIENT_ACTIVATE_ACCOUNT_ROUT')}?verify=${token}`;

    await this.mailerService.sendMail({
      to: 'egypte.2200@gmail.com',
      subject: 'Welcome to our service! Confirm your Email',
      template: './activation-link-mail',
      context: {
        name: user.name,
        activationLink,
      },
    });

    await this.cacheManager.set(
      registerUniqueCacheKey,
      user,
      ms(this.configService.get('JWT_LINKS_EXPIRES_IN')),
    );

    return `Activation Link sent to you email address`;
  }

  async activateAccountOfRegisterWithActivationLink(
    verifyToken: string,
  ): Promise<string> {
    const payload: { user: { email: string } } =
      await this.jWTService.verifyAsync(verifyToken);

    const registerUniqueCacheKey = `register-user-link:${payload.user.email}`;

    const userRegistrationData = (await this.cacheManager.get(
      registerUniqueCacheKey,
    )) as User;

    if (!userRegistrationData) {
      throw new ForbiddenException(
        'Activation Link has been expired, request another one by registering again',
      );
    }

    await this.handlersFactoryService.create<Prisma.UserCreateArgs>(
      this.prismaModel,
      { data: userRegistrationData },
      this.cacheKey,
    );

    await this.cacheManager.delete(registerUniqueCacheKey);

    return 'user activated successfully';
  }

  async resendRegistrationActivationLink(
    resendLinkInput: ResendLinkInput,
  ): Promise<string> {
    const { email } = resendLinkInput;
    const cacheKeyToCheckIfUserReceivedLinkBefore = `register-resend-link:${email}`;

    const isUserReceivedCodeBefore = await this.cacheManager.get(
      cacheKeyToCheckIfUserReceivedLinkBefore,
    );
    if (isUserReceivedCodeBefore) {
      return `'Activation Link already sent to your email, wait ${ms(Number(this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS')))} to get another Link'`;
    }

    const registerUniqueCacheKey = `register-user-link:${email}`;
    const userRegistrationData = (await this.cacheManager.get(
      registerUniqueCacheKey,
    )) as User;
    if (!userRegistrationData) {
      throw new ForbiddenException(
        'Activation Link has been expired, request another one by registering again',
      );
    }

    const token = await this.generateToken(
      { email },
      this.configService.get('JWT_LINKS_EXPIRES_IN'),
    );

    await this.mailerService.sendMail({
      to: 'egypte.2200@gmail.com',
      subject: 'Welcome to our service! Confirm your Email',
      template: './activation-link-mail',
      context: {
        name: userRegistrationData.name,
        activationLink: `${this.configService.get('CLIENT_URL')}${this.configService.get('CLIENT_ACTIVATE_ACCOUNT_ROUT')}?verify=${token}`,
      },
    });

    await this.cacheManager.set(
      cacheKeyToCheckIfUserReceivedLinkBefore,
      email,
      this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS'),
    );

    return `Activation Link resent to you email address`;
  }

  async login(res: Response, loginInput: LoginInput): Promise<User> {
    const { email, phoneNumber, password } = loginInput;
    const user = await this.prismaModel.findUnique({
      where: {
        email,
        phoneNumber,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'No account found with that email/phone number. Would you like to create one?',
      );
    }

    const isPasswordTrue = await bcrypt.compare(password, user.password);

    if (!isPasswordTrue) {
      throw new UnauthorizedException('Invalid credentials. Please try again.');
    }

    const token = await this.jWTService.signAsync({ id: user.id });

    res.cookie(this.configService.get('JWT_TOKEN_NAME'), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ms(this.configService.get('JWT_EXPIRES_IN')),
    });
    res.cookie(this.configService.get('COOKIE_IS_LOGGED_IN_NAME'), true, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ms(this.configService.get('JWT_EXPIRES_IN')),
    });

    return user;
  }

  logout(res: Response): string {
    res.clearCookie(this.configService.get('JWT_TOKEN_NAME'));
    res.clearCookie(this.configService.get('COOKIE_IS_LOGGED_IN_NAME'));

    return 'logged out successfully';
  }

  async forgetPasswordWithResetCode(
    res: Response,
    forgetPasswordResetInput: ForgetPasswordResetInput,
  ): Promise<string> {
    try {
      const { email, phoneNumber } = forgetPasswordResetInput;

      const cacheKeyToCheckIfUserReceivedCodeBeforeByEmail = `forget-password-code:${email}`;
      const cacheKeyToCheckIfUserReceivedCodeBeforeByPhoneNumber = `forget-password-code:${phoneNumber}`;

      const isUserReceivedCodeBefore =
        (await this.cacheManager.get(
          cacheKeyToCheckIfUserReceivedCodeBeforeByEmail,
        )) ||
        (await this.cacheManager.get(
          cacheKeyToCheckIfUserReceivedCodeBeforeByPhoneNumber,
        ));
      if (isUserReceivedCodeBefore) {
        return `'Reset Code already sent to your email, wait ${ms(Number(this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS')))} to get another code'`;
      }

      const user = await this.prismaModel.findUnique({
        where: {
          email,
          phoneNumber,
        },
      });

      if (!user) {
        throw new NotFoundException(
          'No account found with that email/phone number. Would you like to create one?',
        );
      }

      const { code, token } = await this.createCodeAndToken({ id: user.id });

      await this.mailerService.sendMail({
        to: 'egypte.2200@gmail.com',
        subject: 'Welcome to our service! Reset your Password',
        template: './forget-password-mail',
        context: {
          name: user.name,
          resetCode: code,
        },
      });

      res.cookie(
        this.configService.get('COOKIE_FORGET_PASSWORD_TOKEN_NAME'),
        token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: ms(this.configService.get('JWT_CODES_EXPIRES_IN')),
        },
      );

      if (email) {
        await this.cacheManager.set(
          cacheKeyToCheckIfUserReceivedCodeBeforeByEmail,
          email,
          this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS'),
        );
      }
      if (phoneNumber) {
        await this.cacheManager.set(
          cacheKeyToCheckIfUserReceivedCodeBeforeByPhoneNumber,
          phoneNumber,
          this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS'),
        );
      }

      return 'Check your email address, and submit the reset code that is valid for 10 minutes form now';
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async resetOfForgetPasswordWithResetCode(
    context: ContextType,
    forgetPasswordInput: ForgetPasswordInput,
  ): Promise<string> {
    const { req, res } = context;
    const { resetCode, password } = forgetPasswordInput;

    const token = this.getTokenFromRequest(
      req,
      this.configService.get('COOKIE_FORGET_PASSWORD_TOKEN_NAME'),
      'no token provided, go to login or request another reset code',
    );

    const payload: { code: number; user: { id: string } } =
      await this.jWTService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

    if (!payload.code || resetCode !== payload.code) {
      throw new UnauthorizedException('Invalid or Expired reset code');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.handlersFactoryService.update<
      Prisma.UserUpdateInput,
      Prisma.UserInclude
    >(
      this.prismaModel,
      payload.user.id,
      {
        password: hashedPassword,
      },
      this.cacheKey,
    );

    res.clearCookie(
      this.configService.get('COOKIE_FORGET_PASSWORD_TOKEN_NAME'),
    );

    return 'password updated successfully';
  }

  async forgetPasswordWithResetLink(
    forgetPasswordResetInput: ForgetPasswordResetInput,
  ): Promise<string> {
    const { email, phoneNumber } = forgetPasswordResetInput;

    const cacheKeyToCheckIfUserReceivedLinkBeforeByEmail = `forget-password-link:${email}`;
    const cacheKeyToCheckIfUserReceivedLinkBeforeByPhoneNumber = `forget-password-link:${phoneNumber}`;

    const isUserReceivedResetLinkEmail =
      (await this.cacheManager.get(
        cacheKeyToCheckIfUserReceivedLinkBeforeByEmail,
      )) ||
      (await this.cacheManager.get(
        cacheKeyToCheckIfUserReceivedLinkBeforeByPhoneNumber,
      ));
    if (isUserReceivedResetLinkEmail) {
      throw new ForbiddenException(
        'Reset Link has been already sent to you email, check you email right now',
      );
    }

    const user = await this.prismaModel.findUnique({
      where: {
        email,
        phoneNumber,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'No account found with that email/phone number. Would you like to create one?',
      );
    }

    const token = await this.generateToken(
      { id: user.id, email: user.email, phoneNumber: user.phoneNumber },
      this.configService.get('JWT_LINKS_EXPIRES_IN'),
    );

    await this.mailerService.sendMail({
      to: 'egypte.2200@gmail.com',
      subject: 'Welcome to our service! Reset your Password',
      template: './forget-password-link-mail',
      context: {
        name: user.name,
        resetLink: `${this.configService.get('CLIENT_URL')}${this.configService.get('CLIENT_RESET_PASSWORD_ROUT')}?verify=${token}`,
      },
    });

    if (email) {
      await this.cacheManager.set(
        cacheKeyToCheckIfUserReceivedLinkBeforeByEmail,
        user,
        ms(this.configService.get('JWT_LINKS_EXPIRES_IN')),
      );
    }
    if (phoneNumber) {
      await this.cacheManager.set(
        cacheKeyToCheckIfUserReceivedLinkBeforeByPhoneNumber,
        user,
        ms(this.configService.get('JWT_LINKS_EXPIRES_IN')),
      );
    }

    return `Reset Link sent to you email address`;
  }

  async resetOfForgetPasswordWithResetLink(
    forgetPasswordWithResetLinkInput: ForgetPasswordWithResetLinkInput,
  ) {
    const { verifyToken, password } = forgetPasswordWithResetLinkInput;

    const payload: { user: { id: string } } =
      await this.jWTService.verifyAsync(verifyToken);

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.handlersFactoryService.update<
      Prisma.UserUpdateInput,
      Prisma.UserInclude
    >(
      this.prismaModel,
      payload.user.id,
      {
        password: hashedPassword,
      },
      this.cacheKey,
    );

    return 'password updated successfully';
  }

  async resendForgetPasswordResetLink(
    resendLinkInput: ResendLinkInput,
  ): Promise<string> {
    const { email } = resendLinkInput;
    const cacheKeyToCheckIfUserReceivedLinkBefore = `forget-password-resend-link:${email}`;

    const isUserReceivedCodeBefore = await this.cacheManager.get(
      cacheKeyToCheckIfUserReceivedLinkBefore,
    );
    if (isUserReceivedCodeBefore) {
      return `'Reset Link already sent to your email, wait ${ms(Number(this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS')))} to get another Link'`;
    }

    const user = await this.prismaModel.findUnique({
      where: {
        email,
      },
    });

    const token = await this.generateToken(
      { id: user.id, email: user.email },
      this.configService.get('JWT_LINKS_EXPIRES_IN'),
    );

    await this.mailerService.sendMail({
      to: 'egypte.2200@gmail.com',
      subject: 'Welcome to our service! Reset your Password',
      template: './forget-password-link-mail',
      context: {
        name: user.name,
        resetLink: `${this.configService.get('CLIENT_URL')}${this.configService.get('CLIENT_RESET_PASSWORD_ROUT')}?verify=${token}`,
      },
    });

    await this.cacheManager.set(
      cacheKeyToCheckIfUserReceivedLinkBefore,
      email,
      this.configService.get('SENDING_EMAIL_IDLE_PERIOD_IN_MS'),
    );

    return `Reset Link resent to you email address`;
  }

  async changePassword(
    id: string,
    changePasswordInput: ChangePasswordInput,
  ): Promise<string> {
    const { oldPassword, password } = changePasswordInput;
    const user: User = await this.handlersFactoryService.getOneById(
      this.prismaModel,
      id,
      this.cacheKey,
    );

    const isOldPasswordTrue = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordTrue) {
      throw new UnauthorizedException('Invalid old Password!');
    }

    const hashedNewPassword = await bcrypt.hash(password, 10);

    await this.handlersFactoryService.update<
      Prisma.UserUpdateInput,
      Prisma.UserInclude
    >(
      this.prismaModel,
      id,
      {
        password: hashedNewPassword,
      },
      this.cacheKey,
    );

    return 'password changed successfully';
  }

  async changeRole(changeRoleInput: ChangeRoleInput): Promise<User> {
    const { id, role } = changeRoleInput;
    await this.handlersFactoryService.getOneById(
      this.prismaModel,
      id,
      this.cacheKey,
    );

    const user: User = await this.handlersFactoryService.update<
      Prisma.UserUpdateInput,
      Prisma.UserInclude
    >(
      this.prismaModel,
      id,
      {
        role,
      },
      this.cacheKey,
    );

    return user;
  }

  async findAll(apiFeaturesInput: ApiFeaturesInput) {
    const users = await this.handlersFactoryService.getAllWithApiFeatures<
      User,
      Prisma.UserInclude
    >(this.prismaModel, apiFeaturesInput, ['name', 'email'], this.cacheKey);

    return users;
  }

  async findOne(id: string): Promise<User> {
    const user =
      await this.handlersFactoryService.getOneById<Prisma.UserInclude>(
        this.prismaModel,
        id,
        this.cacheKey,
      );

    return user;
  }

  async update(id: string, updateUserInput: UpdateUserInput): Promise<User> {
    if (updateUserInput.password) {
      throw new ForbiddenException('change password cannot be done from here');
    }

    if (updateUserInput.role) {
      throw new ForbiddenException('change role cannot be done from here');
    }

    const data = {
      ...updateUserInput,
      id: undefined,
    };

    const updatedUser = await this.handlersFactoryService.update<
      Prisma.UserUpdateInput,
      Prisma.UserInclude
    >(this.prismaModel, id, data, this.cacheKey);

    return updatedUser;
  }

  async remove(id: string): Promise<User> {
    const deletedUser = await this.handlersFactoryService.remove(
      this.prismaModel,
      id,
      this.cacheKey,
    );

    return deletedUser;
  }

  // utils
  async createCodeAndToken(user: object): Promise<{
    token: string;
    code: number;
  }> {
    const code = Math.floor(10000 + Math.random() * 90000);
    const token = await this.jWTService.signAsync(
      {
        code,
        user,
      },
      {
        expiresIn: this.configService.get('JWT_CODES_EXPIRES_IN'),
      },
    );
    return { token, code };
  }

  async generateToken(
    user: Partial<User>,
    expiresIn: string | number,
  ): Promise<string> {
    const token = await this.jWTService.signAsync(
      {
        user,
      },
      {
        expiresIn,
      },
    );
    return token;
  }

  getTokenFromRequest(
    req: Request,
    tokenName: string,
    noTokenMessage: string = 'no token provided',
  ): string {
    const token =
      req.header('authorization')?.replace('Bearer ', '') ||
      req.cookies[tokenName];

    if (!token) {
      throw new UnauthorizedException(noTokenMessage);
    }

    return token;
  }

  async verifyLoginTokenAndGetUser(req: Request): Promise<User> {
    const token = this.getTokenFromRequest(
      req,
      this.configService.get('JWT_TOKEN_NAME'),
      'no token provided, login first',
    );

    const decodedToken: { id: string } =
      await this.jWTService.verifyAsync(token);

    const user = await this.findOne(decodedToken.id);

    return user;
  }
}
