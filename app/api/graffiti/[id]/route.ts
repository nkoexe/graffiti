import { NextRequest, NextResponse } from 'next/server';
import {
  loadGraffitiData,
  saveGraffitiData,
  deleteGraffitiImages,
  type GraffitiData
} from '@/lib/r2-storage';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existingData = await loadGraffitiData();
    const graffiti = existingData.find(g => g.id === id);

    if (!graffiti) {
      return NextResponse.json({ error: 'Graffiti not found' }, { status: 404 });
    }

    return NextResponse.json(graffiti);
  } catch (error) {
    console.error('Error fetching graffiti:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    let existingData = await loadGraffitiData();
    const graffitiToDelete = existingData.find(g => g.id === id);

    if (!graffitiToDelete) {
      return NextResponse.json({ error: 'Graffiti not found' }, { status: 404 });
    }

    // Delete images from R2 storage
    console.log(`Deleting images for graffiti ID ${id}:`, graffitiToDelete.images);
    await deleteGraffitiImages(graffitiToDelete.images);

    // Remove graffiti from metadata
    existingData = existingData.filter(g => g.id !== id);
    await saveGraffitiData(existingData);

    return NextResponse.json({
      message: 'Graffiti deleted successfully',
      deletedImages: graffitiToDelete.images.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting graffiti:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
