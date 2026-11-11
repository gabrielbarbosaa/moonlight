export abstract class MailPort {
  abstract sendAuthCode(to: string, code: string, expiresInMinutes: number): Promise<void>;
}
