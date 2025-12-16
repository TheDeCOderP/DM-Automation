// src/app/api/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import uploadFile, { createFolder } from '@/utils/zoho.service';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { status: 400 }
      );
    }
    let folderId = null;
    if(folder) {
      const folderRes = await createFolder(folder);
      folderId = folderRes.data.id;
    }

    const response = await uploadFile(file);
    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' }, 
      { status: 500 }
    );
  }
}