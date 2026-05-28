import crypto from 'crypto';

export interface TwoFAConfig {
  userId: string;
  method: 'totp' | 'sms';
  secret?: string;
  phoneNumber?: string;
  isEnabled: boolean;
  backupCodes: string[];
  createdAt: number;
}

export interface TwoFAVerification {
  userId: string;
  code: string;
  timestamp: number;
  isValid: boolean;
}

export class TwoFAService {
  private static readonly TOTP_WINDOW = 30; // seconds
  private static readonly TOTP_DIGITS = 6;

  /**
   * Generate a TOTP secret for the user
   */
  static generateTOTPSecret(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Generate backup codes for recovery
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Verify TOTP code
   */
  static verifyTOTP(secret: string, code: string): boolean {
    if (!secret || !code || code.length !== this.TOTP_DIGITS) {
      return false;
    }

    // Simple TOTP verification (in production, use a library like speakeasy)
    const now = Math.floor(Date.now() / 1000);
    const timeCounter = Math.floor(now / this.TOTP_WINDOW);

    // Check current and adjacent time windows for clock skew
    for (let i = -1; i <= 1; i++) {
      const counter = timeCounter + i;
      const hmac = crypto
        .createHmac('sha1', Buffer.from(secret, 'base64'))
        .update(Buffer.alloc(8));

      // Write counter as big-endian 64-bit integer
      for (let j = 7; j >= 0; j--) {
        hmac.update(Buffer.from([(counter >> (j * 8)) & 0xff]));
      }

      const digest = hmac.digest();
      const offset = digest[digest.length - 1] & 0x0f;
      const value =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

      const totp = (value % Math.pow(10, this.TOTP_DIGITS))
        .toString()
        .padStart(this.TOTP_DIGITS, '0');

      if (totp === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verify backup code and remove it
   */
  static verifyBackupCode(
    backupCodes: string[],
    code: string
  ): { isValid: boolean; remainingCodes: string[] } {
    const index = backupCodes.indexOf(code.toUpperCase());
    if (index === -1) {
      return { isValid: false, remainingCodes: backupCodes };
    }

    const remaining = backupCodes.filter((_, i) => i !== index);
    return { isValid: true, remainingCodes: remaining };
  }

  /**
   * Generate TOTP URI for QR code
   */
  static generateTOTPURI(
    secret: string,
    email: string,
    issuer: string = 'Stellar-Spend'
  ): string {
    const encodedEmail = encodeURIComponent(email);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}`;
  }
}
