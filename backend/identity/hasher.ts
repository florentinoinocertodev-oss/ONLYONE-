import crypto from 'crypto';
import { config } from '../core/config.ts';

function scryptAsync(
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey as Buffer);
    });
  });
}

export class PasswordHasher {
  /**
   * Gera um hash criptográfico seguro e assíncrono para a palavra-passe.
   * Formato persistido: $scrypt$v=1$N=16384,r=8,p=1$<salt_hex>$<hash_hex>
   */
  public static async hash(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error('A palavra-passe deve conter pelo menos 8 caracteres.');
    }

    const salt = crypto.randomBytes(config.scrypt.saltLength);
    const derivedKey = await scryptAsync(password, salt, config.scrypt.keyLength, {
      cost: config.scrypt.cost,
      blockSize: config.scrypt.blockSize,
      parallelization: config.scrypt.parallelization,
    });

    return `$scrypt$v=1$N=${config.scrypt.cost},r=${config.scrypt.blockSize},p=${config.scrypt.parallelization}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  /**
   * Compara uma palavra-passe fornecida com o hash persistido usando timingSafeEqual para mitigar timing attacks.
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 6 || parts[1] !== 'scrypt') {
        return false;
      }

      const paramsPart = parts[3]; // N=16384,r=8,p=1
      const saltHex = parts[4];
      const hashHex = parts[5];

      const paramsMatch = paramsPart.match(/N=(\d+),r=(\d+),p=(\d+)/);
      if (!paramsMatch) {
        return false;
      }

      const cost = parseInt(paramsMatch[1], 10);
      const blockSize = parseInt(paramsMatch[2], 10);
      const parallelization = parseInt(paramsMatch[3], 10);

      const salt = Buffer.from(saltHex, 'hex');
      const expectedKey = Buffer.from(hashHex, 'hex');

      const derivedKey = await scryptAsync(password, salt, expectedKey.length, {
        cost,
        blockSize,
        parallelization,
      });

      if (derivedKey.length !== expectedKey.length) {
        return false;
      }

      return crypto.timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o hash persistido necessita de re-hash para parâmetros mais recentes.
   */
  public static needsRehash(storedHash: string): boolean {
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[2] !== 'v=1') {
      return true;
    }
    const currentParams = `N=${config.scrypt.cost},r=${config.scrypt.blockSize},p=${config.scrypt.parallelization}`;
    return parts[3] !== currentParams;
  }
}
