import crypto from 'crypto';

// Types
export interface EncryptedToken {
  iv: string;
  encryptedData: string;
  authTag?: string; // For GCM mode
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  key: string;
}

// Validate environment variable
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // Ensure key is 32 bytes for AES-256
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }
  
  return key;
};

// Default configuration
const defaultConfig: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  key: getEncryptionKey(),
};

export async function encryptToken(
  token: string, 
  config: EncryptionConfig = defaultConfig
): Promise<string> {
  try {
    const { algorithm, key } = config;
    
    // Generate initialization vector
    const iv = crypto.randomBytes(16);
    
    if (algorithm === 'aes-256-gcm') {
      const cipher = crypto.createCipher(algorithm, key);
      cipher.setAAD(Buffer.from('nextjs-token'));
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return JSON.stringify({
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag.toString('hex'),
      });
    } else {
      // AES-256-CBC
      const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return JSON.stringify({
        iv: iv.toString('hex'),
        encryptedData: encrypted,
      });
    }
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function decryptToken(
  encryptedToken: string, 
  config: EncryptionConfig = defaultConfig
): Promise<string> {
  try {
    const { algorithm, key } = config;
    const { iv, encryptedData, authTag } = JSON.parse(encryptedToken) as EncryptedToken;
    
    const ivBuffer = Buffer.from(iv, 'hex');
    
    if (algorithm === 'aes-256-gcm') {
      if (!authTag) {
        throw new Error('Auth tag is required for GCM decryption');
      }
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from('nextjs-token'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } else {
      // AES-256-CBC
      const decipher = crypto.createDecipheriv(
        algorithm, 
        Buffer.from(key), 
        ivBuffer
      );
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    }
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}