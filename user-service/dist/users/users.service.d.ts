import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export interface UserPayload {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
}
export declare class UsersService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private toResponse;
    private getDefaultRole;
    verifyCredentials(email: string, password: string): Promise<UserPayload>;
    findAll(page: number, limit: number): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<any>;
    create(dto: CreateUserDto): Promise<any>;
    update(id: string, dto: UpdateUserDto): Promise<any>;
    remove(id: string): Promise<any>;
    findProfile(userId: string): Promise<any>;
    assertAdminRole(xUser: string | undefined): void;
}
