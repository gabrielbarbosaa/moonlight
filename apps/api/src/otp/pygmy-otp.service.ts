import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPort, type OtpVerifyResult } from './otp.port';

const REQUEST_TIMEOUT_MS = 8000;

@Injectable()
export class PygmyOtpService extends OtpPort {
  private readonly logger = new Logger(PygmyOtpService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly appName: string;

  constructor(config: ConfigService) {
    super();
    this.baseUrl = config.getOrThrow<string>('PYGMY_URL').replace(/\/+$/, '');
    this.apiKey = config.getOrThrow<string>('PYGMY_API_KEY');
    this.appName = config.get<string>('PYGMY_APP_NAME', 'Moonlight');
  }

  async request(email: string, ip?: string) {
    const headers: Record<string, string> = {};
    if (ip) headers['X-End-User-IP'] = ip;

    const response = await this.call('/v1/otp/request', { email, app_name: this.appName }, headers);

    if (response.status === 429) {
      throw new HttpException(
        'Aguarde um instante antes de pedir outro código',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!response.ok) {
      this.logger.error(`Pygmy recusou o envio (HTTP ${response.status})`);
      throw new ServiceUnavailableException('Não foi possível enviar o código agora');
    }
  }

  async verify(email: string, code: string): Promise<OtpVerifyResult> {
    const response = await this.call('/v1/otp/verify', { email, code });

    if (response.ok) {
      const body = (await response.json().catch(() => null)) as { verified?: boolean } | null;
      return body?.verified === true ? 'ok' : 'invalid';
    }
    if (response.status === 400) return 'invalid';
    if (response.status === 429) return 'too_many_attempts';

    this.logger.error(`Pygmy falhou na validação (HTTP ${response.status})`);
    throw new ServiceUnavailableException('Não foi possível validar o código agora');
  }

  private async call(path: string, body: unknown, extraHeaders: Record<string, string> = {}) {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`Pygmy inacessível: ${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException('Serviço de código indisponível no momento');
    }
  }
}
