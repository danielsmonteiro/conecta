import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** Extrai o access token do cookie httpOnly `access_token`. */
function fromCookie(req: Request): string | null {
  return req?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(), // fallback p/ clientes não-browser
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    if (!payload?.sub) throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
