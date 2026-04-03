"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'warn', 'error', 'debug'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:4200'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    });
    const port = parseInt(process.env.PORT ?? '3001', 10);
    await app.listen(port);
    logger.log(`User Service running on http://localhost:${port}`);
}
bootstrap().catch((err) => {
    console.error('Failed to start User Service:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map