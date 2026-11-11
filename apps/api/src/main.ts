import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { SESSION_COOKIE } from './auth/session.service';

const PUBLIC_TENANT_PATHS =
  /^\/(analytics\/track|tenants\/public\/[^/]+\/report|booking\/public\/[^/]+(\/slots|\/book)?)$/;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  }

  app.use(cookieParser());

  const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
  const rootDomain = (process.env.ROOT_DOMAIN ?? 'localhost:3000').toLowerCase();

  const isTenantOrigin = (origin: string | undefined) => {
    if (!origin) return false;
    try {
      return new URL(origin).host.toLowerCase().endsWith(`.${rootDomain}`);
    } catch {
      return false;
    }
  };

  app.enableCors((req: { originalUrl: string; headers: { origin?: string } }, callback) => {
    const path = req.originalUrl.split('?')[0];
    if (PUBLIC_TENANT_PATHS.test(path) && isTenantOrigin(req.headers.origin)) {
      callback(null, { origin: true, credentials: false, methods: ['GET', 'POST', 'OPTIONS'] });
      return;
    }
    callback(null, { origin: webUrl, credentials: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SiteBuilder API')
      .setVersion('0.0.0')
      .addCookieAuth(SESSION_COOKIE)
      .build();
    const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`API rodando em http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger em http://localhost:${port}/docs`);
  }
}

bootstrap();
