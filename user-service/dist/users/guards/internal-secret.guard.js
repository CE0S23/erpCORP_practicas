"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalSecretGuard = void 0;
const common_1 = require("@nestjs/common");
let InternalSecretGuard = class InternalSecretGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const provided = request.headers['x-internal-secret'];
        const expected = process.env.INTERNAL_SECRET;
        if (!expected) {
            throw new common_1.UnauthorizedException('INTERNAL_SECRET env var is not configured');
        }
        if (!provided || provided !== expected) {
            throw new common_1.UnauthorizedException('Invalid or missing X-Internal-Secret header');
        }
        return true;
    }
};
exports.InternalSecretGuard = InternalSecretGuard;
exports.InternalSecretGuard = InternalSecretGuard = __decorate([
    (0, common_1.Injectable)()
], InternalSecretGuard);
//# sourceMappingURL=internal-secret.guard.js.map