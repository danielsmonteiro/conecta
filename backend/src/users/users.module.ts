import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/users/me
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const full = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });
    if (!full) return null;
    const { passwordHash, ...safe } = full;
    return { user: safe };
  }
}

@Module({ controllers: [UsersController] })
export class UsersModule {}
