"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
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
};
let UsersService = UsersService_1 = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    toResponse(user) {
        const { passwordHash, userRoles, ...base } = user;
        const firstRole = userRoles?.[0];
        const role = firstRole?.role?.name ?? null;
        const permissions = (userRoles ?? []).flatMap((ur) => (ur.role?.rolePermissions ?? []).map((rp) => rp.permission.key));
        return { ...base, role, permissions };
    }
    async getDefaultRole() {
        const role = await this.prisma.role.findUnique({ where: { name: client_1.AppRole.user } });
        if (!role) {
            throw new common_1.BadRequestException("Default role 'user' not found. Run the database seed first.");
        }
        return role;
    }
    async verifyCredentials(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: WITH_ROLE_AND_PERMISSIONS,
        });
        const DUMMY_HASH = '$2b$12$invalidhashfortimingnormalizationxxxxxxxxxxxxxxxxxxxxxxxx';
        const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
        const isValid = await bcrypt.compare(password, hashToCompare);
        if (!user || !isValid || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials or account is disabled');
        }
        const role = user.userRoles[0]?.role?.name ?? 'user';
        const permissions = user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key));
        return { id: user.id, email: user.email, name: user.name, role, permissions };
    }
    async findAll(page, limit) {
        const skip = (page - 1) * limit;
        const [total, rows] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: WITH_ROLE_AND_PERMISSIONS,
            }),
        ]);
        return {
            data: rows.map((u) => this.toResponse(u)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: WITH_ROLE_AND_PERMISSIONS,
        });
        if (!user)
            throw new common_1.NotFoundException(`User with id "${id}" not found`);
        return this.toResponse(user);
    }
    async create(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new common_1.ConflictException(`Email "${dto.email}" is already registered`);
        }
        const targetRoleName = dto.role ?? client_1.AppRole.user;
        const role = await this.prisma.role.findUnique({ where: { name: targetRoleName } });
        if (!role) {
            throw new common_1.BadRequestException(`Role "${targetRoleName}" does not exist in the database`);
        }
        const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
        const passwordHash = await bcrypt.hash(dto.password, rounds);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
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
    async update(id, dto) {
        await this.findOne(id);
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: WITH_ROLE_AND_PERMISSIONS,
        });
        this.logger.log(`User updated: ${user.id}`);
        return this.toResponse(user);
    }
    async remove(id) {
        await this.findOne(id);
        const user = await this.prisma.user.update({
            where: { id },
            data: { isActive: false },
            include: WITH_ROLE_AND_PERMISSIONS,
        });
        this.logger.log(`User soft-deleted: ${user.id}`);
        return this.toResponse(user);
    }
    async findProfile(userId) {
        return this.findOne(userId);
    }
    assertAdminRole(xUser) {
        if (!xUser)
            throw new common_1.ForbiddenException('X-User header is missing');
        let user;
        try {
            user = JSON.parse(xUser);
        }
        catch {
            throw new common_1.ForbiddenException('X-User header is malformed');
        }
        const allowed = [client_1.AppRole.admin, client_1.AppRole.superAdmin];
        if (!allowed.includes(user?.role ?? '')) {
            throw new common_1.ForbiddenException('Only admin or superAdmin users can list all users');
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map