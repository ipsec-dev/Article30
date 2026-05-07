import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const TOKEN_BYTES = 32;
const TTL_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordResetTokenService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  async generate(userId: string): Promise<string> {
    const plaintext = randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = this.hash(plaintext);
    const expiresAt = new Date(Date.now() + TTL_MS);
    await this.prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return plaintext;
  }

  async verify(plaintext: string): Promise<string | null> {
    const tokenHash = this.hash(plaintext);
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row) {
      return null;
    }
    if (row.usedAt) {
      return null;
    }
    if (row.expiresAt.getTime() < Date.now()) {
      return null;
    }
    return row.userId;
  }

  async markUsed(plaintext: string): Promise<void> {
    const tokenHash = this.hash(plaintext);
    await this.prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }
}
