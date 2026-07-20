export interface IMailService {
  sendVerificationEmail(to: string, token: string): Promise<void>;
  sendResetPasswordEmail(to: string, token: string): Promise<void>;
}

export class MockMailService implements IMailService {
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = `http://localhost:5173/verify-email?token=${token}`;
    console.log("\n==================================================");
    console.log(`[MAIL SERVICE] 📧 Sending Verification Email to: ${to}`);
    console.log(`[MAIL SERVICE] Click the link below to verify your email:`);
    console.log(`[MAIL SERVICE] 👉 ${url}`);
    console.log("==================================================\n");
  }

  async sendResetPasswordEmail(to: string, token: string): Promise<void> {
    const url = `http://localhost:5173/reset-password?token=${token}`;
    console.log("\n==================================================");
    console.log(`[MAIL SERVICE] 📧 Sending Password Reset Email to: ${to}`);
    console.log(`[MAIL SERVICE] Click the link below to reset your password:`);
    console.log(`[MAIL SERVICE] 👉 ${url}`);
    console.log("==================================================\n");
  }
}

export const mailService: IMailService = new MockMailService();
