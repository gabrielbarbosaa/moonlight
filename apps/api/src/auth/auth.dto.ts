import { loginSchema, registerSchema, verifyCodeSchema } from '@moonlight/schemas';
import { createZodDto } from 'nestjs-zod';

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class VerifyCodeDto extends createZodDto(verifyCodeSchema) {}
