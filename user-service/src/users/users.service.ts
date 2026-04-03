import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, AppRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Payload that the gateway receives after successful credential verification */
export interface UserPayload {
  id:          string;
  email:       string;
  name:        string;
  role:        string;
  permissions: string[];
}

// ─── Full Prisma include fragment (shared by queries) ─────────────────────────

const WITH_ROLE_AND_PERMISSIONS = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} as const;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Strips password_hash and flattens role/permissions for API responses. */
  private toResponse(user: any) {
    const { passwordHash, userRoles, ...base } = user;

    const firstRole = userRoles?.[0];
    const role        = firstRole?.role?.name ?? null;
    const permissions: string[] = (userRoles ?? []).flatMap((ur: any) =>
      (ur.role?.rolePermissions ?? []).map((rp: any) => rp.permission.key),
    );

    return { ...base, role, permissions };
  }

  /** Returns the default 'user' Role record, throwing if seed data is missing. */
  private async getDefaultRole() {
    const role = await this.prisma.role.findUnique({ where: { name: AppRole.user } });
    if (!role) {
      throw new BadRequestException(
        "Default role 'user' not found. Run the database seed first.",
      );
    }
    return role;
  }

  // ── Internal: verify credentials ──────────────────────────────────────────

  /**
   * Called exclusively by the API Gateway's POST /auth/login.
   * Returns the full user payload (id, email, name, role, permissions[]) or
   * throws UnauthorizedException on failure.
   */
  async verifyCredentials(email: string, password: string): Promise<UserPayload> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: WITH_ROLE_AND_PERMISSIONS,
    });

    // Use a constant-time comparison path for both "not found" and "wrong password"
    // to prevent timing-based user enumeration.
    const DUMMY_HASH =
      '$2b$12$invalidhashfortimingnormalizationxxxxxxxxxxxxxxxxxxxxxxxx';

    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const isValid       = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or account is disabled');
    }

    const role = user.userRoles[0]?.role?.name ?? 'user';
    const permissions: string[] = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.key),
    );

    return { id: user.id, email: user.email, name: user.name, role, permissions };
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  /** Paginated list of all users. */
  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: WITH_ROLE_AND_PERMISSIONS,
      }),
    ]);

    return {
      data:       rows.map((u) => this.toResponse(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Single user by id — 404 if not found. */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where:   { id },
      include: WITH_ROLE_AND_PERMISSIONS,
    });

    if (!user) throw new NotFoundException(`User with id "${id}" not found`);

    return this.toResponse(user);
  }

  /**
   * Creates a new user.
   *  - Hashes the password with bcrypt (rounds from BCRYPT_ROUNDS env).
   *  - Assigns the 'user' role by default, or the role provided in the DTO.
   *  - Throws 409 if the email is already taken.
   */
  async create(dto: CreateUserDto) {
    // Guard: unique email
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    // Resolve target role
    const targetRoleName = dto.role ?? AppRole.user;
    const role = await this.prisma.role.findUnique({ where: { name: targetRoleName } });
    if (!role) {
      throw new BadRequestException(`Role "${targetRoleName}" does not exist in the database`);
    }

    // Hash password
    const rounds       = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    // Create user + role assignment in a single transaction
    const user = await this.prisma.user.create({
      data: {
        email:        dto.email,
        name:         dto.name,
        passwordHash,
        userRoles: {
          create: { roleId: role.id },
        },
      },
      include: WITH_ROLE_AND_PERMISSIONS,
    });

    this.logger.log(`User created: ${user.id} (${user.email})`);

    return this.toResponse(user);
  }

  /**
   * Updates a user's mutable fields: name, avatarUrl, isActive.
   * 404 if user does not exist.
   */
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // throws 404 if missing

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name      !== undefined && { name:      dto.name }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.isActive  !== undefined && { isActive:  dto.isActive }),
      },
      include: WITH_ROLE_AND_PERMISSIONS,
    });

    this.logger.log(`User updated: ${user.id}`);

    return this.toResponse(user);
  }

  /**
   * Soft-deletes a user by setting isActive = false.
   * 404 if user does not exist.
   */
  async remove(id: string) {
    await this.findOne(id); // throws 404 if missing

    const user = await this.prisma.user.update({
      where: { id },
      data:  { isActive: false },
      include: WITH_ROLE_AND_PERMISSIONS,
    });

    this.logger.log(`User soft-deleted: ${user.id}`);

    return this.toResponse(user);
  }

  /**
   * Returns the authenticated user's own profile.
   * The caller's id is extracted from the X-User header by the gateway.
   */
  async findProfile(userId: string) {
    return this.findOne(userId);
  }

  /**
   * Guards: only admin or superAdmin roles may list all users.
   * Called by the controller before findAll().
   */
  assertAdminRole(xUser: string | undefined) {
    if (!xUser) throw new ForbiddenException('X-User header is missing');

    let user: { role?: string };
    try {
      user = JSON.parse(xUser);
    } catch {
      throw new ForbiddenException('X-User header is malformed');
    }

    const allowed: string[] = [AppRole.admin, AppRole.superAdmin];
    if (!allowed.includes(user?.role ?? '')) {
      throw new ForbiddenException('Only admin or superAdmin users can list all users');
    }
  }
}
