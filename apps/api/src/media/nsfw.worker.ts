import { parentPort } from 'node:worker_threads';
import * as tf from '@tensorflow/tfjs';
import * as nsfw from 'nsfwjs';
import {
  NSFW_INPUT_SIZE,
  type NsfwRequest,
  type NsfwResponse,
  type NsfwScores,
} from './nsfw.types';

const port = parentPort;
if (!port) throw new Error('nsfw.worker precisa rodar em um worker thread');

const send = (message: NsfwResponse) => port.postMessage(message);

async function start() {
  await tf.setBackend('cpu');
  await tf.ready();
  const model = await nsfw.load('MobileNetV2');
  send({ type: 'ready' });

  port!.on('message', async (request: NsfwRequest) => {
    try {
      const pixels = new Int32Array(request.pixels.length);
      pixels.set(request.pixels);
      const tensor = tf.tensor3d(pixels, [NSFW_INPUT_SIZE, NSFW_INPUT_SIZE, 3], 'int32');
      const predictions = await model.classify(tensor);
      tensor.dispose();
      const scores: NsfwScores = { Drawing: 0, Hentai: 0, Neutral: 0, Porn: 0, Sexy: 0 };
      for (const prediction of predictions) {
        scores[prediction.className as keyof NsfwScores] = prediction.probability;
      }
      send({ type: 'result', id: request.id, scores });
    } catch (error) {
      send({ type: 'failure', id: request.id, message: String(error) });
    }
  });
}

start().catch((error) => send({ type: 'failure', id: 0, message: String(error), fatal: true }));
