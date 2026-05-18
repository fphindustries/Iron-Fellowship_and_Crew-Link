import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorsIoAdapter } from './realtime/socket-io.adapter';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  // Accept both localhost and 127.0.0.1 variants — Google OAuth redirects
  // sometimes resolve localhost to 127.0.0.1, causing CORS failures otherwise.
  const allowedOrigins = [
    frontendUrl,
    frontendUrl.replace('localhost', '127.0.0.1'),
    frontendUrl.replace('127.0.0.1', 'localhost'),
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useWebSocketAdapter(new CorsIoAdapter(app, allowedOrigins));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
