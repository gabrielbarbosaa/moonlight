export const NSFW_INPUT_SIZE = 224;

export type NsfwScores = {
  Drawing: number;
  Hentai: number;
  Neutral: number;
  Porn: number;
  Sexy: number;
};

export type NsfwRequest = { id: number; pixels: Uint8Array };

export type NsfwResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; scores: NsfwScores }
  | { type: 'failure'; id: number; message: string; fatal?: boolean };
