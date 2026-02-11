import { IdSequence, Prisma } from '@prisma/client';
import { prisma } from './prisma';

interface GenerateSequentialIdOptions {
  padLength?: number;
  separator?: string;
  maxRetries?: number;
}

const DEFAULT_OPTIONS: Required<GenerateSequentialIdOptions> = {
  padLength: 4,
  separator: '-',
  maxRetries: 3
};

async function generateSequentialId(
  prefix: string, 
  options: GenerateSequentialIdOptions = {}
): Promise<string> {
  const { padLength, separator, maxRetries } = { ...DEFAULT_OPTIONS, ...options };
  
  // Validation
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('Prefix must be a non-empty string');
  }

  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const idSequence = await prisma.$transaction(async (tx): Promise<IdSequence> => {
        const currentSequence = await tx.idSequence.upsert({
          where: { prefix },
          update: { 
            lastNumber: { increment: 1 },
            updatedAt: new Date()
          },
          create: { 
            prefix, 
            lastNumber: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          },
        });
        return currentSequence;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });

      return `${prefix}${separator}${String(idSequence.lastNumber).padStart(padLength, "0")}`;

    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw new Error(`Failed to generate sequential ID after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
    }
  }

  throw new Error('Unexpected error in generateSequentialId');
}

// Utility functions
async function getSequenceInfo(prefix: string): Promise<IdSequence | null> {
  return await prisma.idSequence.findUnique({
    where: { prefix }
  });
}

async function resetSequence(prefix: string, startNumber: number = 1): Promise<IdSequence> {
  if (startNumber < 1) {
    throw new Error('Start number must be greater than 0');
  }

  return await prisma.idSequence.upsert({
    where: { prefix },
    update: { 
      lastNumber: startNumber - 1,
      updatedAt: new Date()
    },
    create: { 
      prefix, 
      lastNumber: startNumber - 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
  });
}

export { 
  generateSequentialId, 
  getSequenceInfo, 
  resetSequence,
  type GenerateSequentialIdOptions 
};