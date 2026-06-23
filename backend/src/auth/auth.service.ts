import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL ?? 900);
const REFRESH_TTL = Number(process.env.JWT_REFRESH_TTL ?? 604800);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Valida credenciais e retorna o usuário (sem o hash). */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');
    const { passwordHash, ...safe } = user;
    return safe;
  }

  /** Emite access + refresh tokens; persiste o hash do refresh. */
  async issueTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      expiresIn: ACCESS_TTL,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: REFRESH_TTL,
    });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  /** Verifica um refresh token, rotaciona-o e emite um novo par. */
  async rotateRefresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Sem refresh token');
    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
    // Confere se há um token ativo correspondente e revoga (rotação).
    const active = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    const match = await this.firstMatching(active, refreshToken);
    if (!match) throw new UnauthorizedException('Refresh token revogado');
    await this.prisma.refreshToken.update({
      where: { id: match.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens({ id: payload.sub, email: payload.email, role: payload.role });
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async firstMatching(
    tokens: { id: string; tokenHash: string }[],
    raw: string,
  ): Promise<{ id: string } | null> {
    for (const t of tokens) {
      if (await bcrypt.compare(raw, t.tokenHash)) return t;
    }
    return null;
  }

  cookieOptions(maxAgeSeconds: number) {
    return {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: maxAgeSeconds * 1000,
    };
  }

  get accessTtl() {
    return ACCESS_TTL;
  }
  get refreshTtl() {
    return REFRESH_TTL;
  }
}
