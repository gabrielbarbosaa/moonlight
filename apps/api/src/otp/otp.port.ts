export type OtpVerifyResult = 'ok' | 'invalid' | 'too_many_attempts';

export abstract class OtpPort {
  abstract request(email: string, ip?: string): Promise<void>;
  abstract verify(email: string, code: string): Promise<OtpVerifyResult>;
}
