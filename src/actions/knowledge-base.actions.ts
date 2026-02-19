"use server";

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { uploadFile } from '@/lib/upload';

type ItemType = 'LINK' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NOTE';

interface CreateKnowledgeBaseItemInput {
  title: string;
  description?: string;
  type: ItemType;
  url?: string;
  tags?: string[];
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  thumbnail?: string;
}

async function getUserBrand(userId: string) {
  const userBrand = await prisma.userBrand.findFirst({
    where: { userId },
  });

  if (!userBrand) {
    throw new Error('No brand found for user');
  }

  return userBrand;
}

export async function getKnowledgeBaseItems() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userBrand = await getUserBrand(session.user.id);

    const items = await prisma.knowledgeBase.findMany({
      where: { brandId: userBrand.brandId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, items };
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch items' };
  }
}

export async function createKnowledgeBaseItem(input: CreateKnowledgeBaseItemInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userBrand = await getUserBrand(session.user.id);

    if (!input.title || !input.type) {
      throw new Error('Title and type are required');
    }

    const item = await prisma.knowledgeBase.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        url: input.url,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        thumbnail: input.thumbnail,
        tags: input.tags || [],
        brandId: userBrand.brandId,
        userId: session.user.id,
      },
    });

    revalidatePath('/knowledge-base');
    return { success: true, item };
  } catch (error) {
    console.error('Error creating knowledge base item:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create item' };
  }
}

export async function updateKnowledgeBaseItem(
  id: string,
  data: Partial<CreateKnowledgeBaseItemInput>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const item = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    if (item.userId !== session.user.id) {
      throw new Error('Forbidden');
    }

    const updatedItem = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.tags && { tags: data.tags }),
      },
    });

    revalidatePath('/knowledge-base');
    return { success: true, item: updatedItem };
  } catch (error) {
    console.error('Error updating knowledge base item:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update item' };
  }
}

export async function deleteKnowledgeBaseItem(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const item = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    if (item.userId !== session.user.id) {
      throw new Error('Forbidden');
    }

    await prisma.knowledgeBase.delete({
      where: { id },
    });

    revalidatePath('/knowledge-base');
    return { success: true };
  } catch (error) {
    console.error('Error deleting knowledge base item:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete item' };
  }
}

export async function uploadKnowledgeBaseFile(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userBrand = await getUserBrand(session.user.id);

    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as ItemType;

    if (!file) {
      throw new Error('No file provided');
    }

    // Upload to media CDN
    const fileUrl = await uploadFile(file, 'knowledge-base');

    // Determine thumbnail URL (for images, use the same URL)
    const thumbnail = file.type.startsWith('image/') ? fileUrl : undefined;

    // Create database entry
    const item = await prisma.knowledgeBase.create({
      data: {
        title: title || file.name,
        description,
        type: type || 'DOCUMENT',
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        thumbnail,
        brandId: userBrand.brandId,
        userId: session.user.id,
      },
    });

    revalidatePath('/knowledge-base');
    return { success: true, item };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to upload file' };
  }
}
