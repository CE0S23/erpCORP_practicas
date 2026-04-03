import { AppRole } from '@prisma/client';
export declare class CreateUserDto {
    email: string;
    name: string;
    password: string;
    role?: AppRole;
}
