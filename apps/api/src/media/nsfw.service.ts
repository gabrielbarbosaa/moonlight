import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  NSFW_INPUT_SIZE,
  type NsfwRequest,
  type NsfwResponse,
  type NsfwScores,
} from './nsfw.types';

const DEFAULT_THRESHOLD = 0.6;
const READY_TIMEOUT_MS = 60_000;
const CLASSIFY_TIMEOUT_MS = 30_000;

type Pending = {
  resolve: (scores: NsfwScores) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

@Injectable()
export class NsfwService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NsfwService.name);
  private readonly enabled = process.env.NSFW_CHECK_ENABLED !== 'false';
  private readonly threshold = this.readThreshold();
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Verificação de imagens NSFW desativada (NSFW_CHECK_ENABLED=false)');
      return;
    }
    this.ready = this.spawn();
    this.ready.catch((error) => this.logger.error(`Falha ao iniciar o classificador: ${error}`));
  }

  async onModuleDestroy() {
    await this.worker?.terminate();
    this.worker = null;
  }

  async assertSafe(image: Buffer, ownerId: string) {
    if (!this.enabled) return;

    const scores = await this.classify(image);
    const explicit = scores.Porn + scores.Hentai;
    if (explicit >= this.threshold) {
      this.logger.warn(
        `Imagem recusada (usuário ${ownerId}): porn=${scores.Porn.toFixed(2)} hentai=${scores.Hentai.toFixed(2)}`,
      );
      throw new BadRequestException(
        'Esta imagem foi recusada porque parece conter conteúdo adulto, que não é permitido na plataforma.',
      );
    }
  }

  async classify(image: Buffer): Promise<NsfwScores> {
    const worker = await this.ensureWorker();
    const pixels = await sharp(image)
      .flatten({ background: '#ffffff' })
      .resize(NSFW_INPUT_SIZE, NSFW_INPUT_SIZE, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer();

    const id = this.nextId++;
    const request: NsfwRequest = { id, pixels: new Uint8Array(pixels) };

    return new Promise<NsfwScores>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ServiceUnavailableException('A verificação da imagem demorou demais.'));
      }, CLASSIFY_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      worker.postMessage(request);
    });
  }

  private async ensureWorker(): Promise<Worker> {
    try {
      if (!this.ready) this.ready = this.spawn();
      await this.ready;
    } catch {
      this.ready = null;
      throw new ServiceUnavailableException(
        'A verificação de imagens está indisponível. Tente novamente em instantes.',
      );
    }
    if (!this.worker) {
      this.ready = null;
      throw new ServiceUnavailableException(
        'A verificação de imagens está indisponível. Tente novamente em instantes.',
      );
    }
    return this.worker;
  }

  private spawn(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'nsfw.worker.js'));
      const startTimer = setTimeout(() => {
        reject(new Error('o classificador não ficou pronto a tempo'));
        void worker.terminate();
      }, READY_TIMEOUT_MS);

      worker.on('message', (message: NsfwResponse) => {
        if (message.type === 'ready') {
          clearTimeout(startTimer);
          this.worker = worker;
          this.logger.log('Classificador NSFW pronto');
          resolve();
          return;
        }
        if (message.type === 'failure' && message.fatal) {
          clearTimeout(startTimer);
          reject(new Error(message.message));
          return;
        }
        const entry = this.pending.get(message.id);
        if (!entry) return;
        clearTimeout(entry.timer);
        this.pending.delete(message.id);
        if (message.type === 'result') entry.resolve(message.scores);
        else entry.reject(new ServiceUnavailableException('Falha ao verificar a imagem.'));
      });

      const onGone = (error?: Error) => {
        clearTimeout(startTimer);
        if (this.worker === worker) {
          this.worker = null;
          this.ready = null;
        }
        for (const [id, entry] of this.pending) {
          clearTimeout(entry.timer);
          entry.reject(
            new ServiceUnavailableException('A verificação de imagens foi interrompida.'),
          );
          this.pending.delete(id);
        }
        if (error) reject(error);
      };
      worker.on('error', onGone);
      worker.on('exit', () => onGone());
    });
  }

  private readThreshold() {
    const value = Number(process.env.NSFW_THRESHOLD);
    return Number.isFinite(value) && value > 0 && value <= 1 ? value : DEFAULT_THRESHOLD;
  }
}
