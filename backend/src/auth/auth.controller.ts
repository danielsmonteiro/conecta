import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  // POST /api/auth/login  → 201 { user }  + cookies access_token/refresh_token
  @Post('login')
  @HttpCode(201)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    const { accessToken, refreshToken } = await this.auth.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    res.cookie('access_token', accessToken, this.auth.cookieOptions(this.auth.accessTtl));
    res.cookie('refresh_token', refreshToken, this.auth.cookieOptions(this.auth.refreshTtl));
    return { user };
  }

  // POST /api/auth/refresh  → novo access token (cliente repete a request original)
  @Post('refresh')
  @HttpCode(201)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    const { accessToken, refreshToken } = await this.auth.rotateRefresh(token);
    res.cookie('access_token', accessToken, this.auth.cookieOptions(this.auth.accessTtl));
    res.cookie('refresh_token', refreshToken, this.auth.cookieOptions(this.auth.refreshTtl));
    return { success: true };
  }

  // POST /api/auth/logout  → revoga refresh tokens e limpa cookies
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.revokeAll(user.id);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { success: true };
  }

  // GET /api/auth/me  (conveniência; produção usa /api/users/me)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    const full = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });
    if (!full) throw new UnauthorizedException();
    const { passwordHash, ...safe } = full;
    return { user: safe };
  }
}
