import { Body, Controller, Get, GoneException, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { MailService } from '../mail/mail.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import {
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
} from '../../common/middleware/csrf.middleware';

const SIGNUP_RATE_LIMIT = 3;
const LOGIN_RATE_LIMIT = 5;
const FORGOT_RATE_LIMIT = 3;
const RESET_RATE_LIMIT = 10;
const CHANGE_PASSWORD_RATE_LIMIT = 5;
const RATE_LIMIT_TTL_MS = 60000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  @Throttle({ default: { limit: SIGNUP_RATE_LIMIT, ttl: RATE_LIMIT_TTL_MS } })
  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto, @Req() req: Request) {
    const user = await this.authService.signup(dto);
    req.session.userId = user.id;
    return user;
  }

  @Throttle({ default: { limit: LOGIN_RATE_LIMIT, ttl: RATE_LIMIT_TTL_MS } })
  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.login(dto);
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate(err => {
        if (err) {
          reject(err);
          return;
        }
        req.session.userId = user.id;
        req.session.csrfToken = generateCsrfToken();
        setCsrfCookie(res, req.session.csrfToken);
        resolve();
      });
    });
    return user;
  }

  @Throttle({ default: { limit: FORGOT_RATE_LIMIT, ttl: RATE_LIMIT_TTL_MS } })
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    if (!this.mailService.isEnabled()) {
      throw new GoneException({ error: 'smtp_disabled' });
    }
    const acceptLanguage = req.headers['accept-language'];
    await this.authService.forgotPassword(dto, acceptLanguage);
    return { ok: true };
  }

  @Throttle({ default: { limit: RESET_RATE_LIMIT, ttl: RATE_LIMIT_TTL_MS } })
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const acceptLanguage = req.headers['accept-language'];
    await this.authService.resetPassword(dto, acceptLanguage);
    return { ok: true };
  }

  @Throttle({ default: { limit: CHANGE_PASSWORD_RATE_LIMIT, ttl: RATE_LIMIT_TTL_MS } })
  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const acceptLanguage = req.headers['accept-language'];
    const sessionId = req.sessionID;
    await this.authService.changePassword(user.id, sessionId, dto, acceptLanguage);
    return { ok: true };
  }

  @SkipThrottle()
  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      clearCsrfCookie(res);
      res.json({ ok: true });
    });
  }

  @SkipThrottle()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      approved: user.approved,
    };
  }

  @Patch('me')
  async updateMe(@Body() dto: UpdateProfileDto, @CurrentUser() user: RequestUser) {
    return this.authService.updateProfile(user.id, dto);
  }
}
