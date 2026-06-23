import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protege rotas exigindo um access token válido (cookie ou Bearer). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
