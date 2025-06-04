import { NextRequest, NextResponse } from 'next/server';
import {
  loadGraffitiData,
  saveGraffitiData,
  uploadImage,
  generateImageFilename,
  type GraffitiData
} from '@/lib/r2-storage';

export async function GET() {
  try {
    const graffitiData = await loadGraffitiData();
    return NextResponse.json(graffitiData);
  } catch (error) {
    console.error('Error fetching graffiti data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graffiti data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const description = formData.get('description') as string;
    const author = formData.get('author') as string;
    const latitude = parseFloat(formData.get('latitude') as string);
    const longitude = parseFloat(formData.get('longitude') as string);

    // Get all image files
    const imageFiles: File[] = [];
    let imageIndex = 0;
    while (true) {
      const imageFile = formData.get(`image${imageIndex}`) as File | null;
      if (!imageFile) break;
      imageFiles.push(imageFile);
      imageIndex++;
    }

    // Validate required fields
    if (!description || !author || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load existing data to get the next ID
    const existingData = await loadGraffitiData();
    const newId = Math.max(...existingData.map((g: GraffitiData) => g.id), 0) + 1;

    // Upload images to R2 storage
    const imageUrls: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (file instanceof File) {
        try {
          const filename = generateImageFilename(file.name, newId, i);
          const imageUrl = await uploadImage(file, filename);
          imageUrls.push(imageUrl);
        } catch (error) {
          console.error(`Error uploading image ${i}:`, error);
          // Continue with other images even if one fails
        }
      }
    }

    // Create new graffiti entry
    const newGraffiti: Omit<GraffitiData, 'name'> = {
      id: newId,
      description,
      author,
      posix: [latitude, longitude],
      uploadDate: new Date().toISOString(),
      images: imageUrls
    };

    // Add to existing data and save
    const updatedData = [...existingData, newGraffiti as GraffitiData];
    await saveGraffitiData(updatedData);

    return NextResponse.json(
      { message: 'Graffiti uploaded successfully', graffiti: newGraffiti },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading graffiti:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
