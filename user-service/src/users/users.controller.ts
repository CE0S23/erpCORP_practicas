import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { InternalSecretGuard } from './guards/internal-secret.guard';
import { UsersService }        from './users.service';
import { CreateUserDto }       from './dto/create-user.dto';
import { UpdateUserDto }       from './dto/update-user.dto';

// ─── Internal endpoints ───────────────────────────────────────────────────────

@Controller('internal')
export class InternalController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /internal/verify-credentials
   *
   * Called exclusively by the API Gateway's auth/login route.
   * Protected by the shared X-Internal-Secret header.
   * Returns { user: { id, email, name, role, permissions[] } }
   */
  @Post('verify-credentials')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalSecretGuard)
  async verifyCredentials(
    @Body() body: { email: string; password: string },
  ) {
    const user = await this.usersService.verifyCredentials(body.email, body.password);
    return { user };
  }
}

// ─── Public (gateway-proxied) endpoints ──────────────────────────────────────

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/profile/me
   *
   * Returns the authenticated user's own profile.
   * MUST be declared before GET /users/:id to avoid NestJS matching
   * 'profile' as the :id parameter.
   *
   * The gateway injects the authenticated user as X-User: JSON string.
   */
  @Get('profile/me')
  async getProfile(@Headers('x-user') xUser: string) {
    let userId: string;
    try {
      userId = JSON.parse(xUser).id;
    } catch {
      return { error: 'X-User header is missing or malformed' };
    }
    return this.usersService.findProfile(userId);
  }

  /**
   * GET /users?page=1&limit=10
   *
   * Paginated list of all users.
   * Restricted by the granular `view_users` permission (or master bypass).
   */
  @Get()
  async findAll(
    @Headers('x-user') xUser: string,
    @Query('page',  new ParseIntPipe({ optional: true })) page  = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    this.usersService.assertCanViewUsers(xUser);
    return this.usersService.findAll(page, limit);
  }

  /**
   * GET /users/:id
   *
   * Returns a single user with their role and permissions.
   * 404 if the user does not exist.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * POST /users
   *
   * Creates a new user.
   *  - Hashes the password (bcrypt, rounds=BCRYPT_ROUNDS).
   *  - Assigns the 'user' role by default, or the role specified in the body.
   *  - 409 if the email is already taken.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Headers('x-user') xUser: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(dto, xUser);
  }

  /**
   * PUT /users/:id
   *
   * Updates name, avatarUrl, and/or isActive.
   * Password updates are not supported through this endpoint.
   * 404 if the user does not exist.
   */
  @Put(':id')
  update(@Headers('x-user') xUser: string, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto, xUser);
  }

  /**
   * DELETE /users/:id
   *
   * Soft-deletes the user (sets isActive = false).
   * 404 if the user does not exist.
   */
  @Delete(':id')
  remove(@Headers('x-user') xUser: string, @Param('id') id: string) {
    return this.usersService.remove(id, xUser);
  }
}
