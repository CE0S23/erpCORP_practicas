import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class InternalController {
    private readonly usersService;
    constructor(usersService: UsersService);
    verifyCredentials(body: {
        email: string;
        password: string;
    }): Promise<{
        user: import("./users.service").UserPayload;
    }>;
}
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(xUser: string): Promise<any>;
    findAll(xUser: string, page?: number, limit?: number): Promise<{
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
}
