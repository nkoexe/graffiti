import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { validateR2Config, handleR2Error } from './r2-errors';

// Initialize S3 client for Cloudflare R2 (will be created when first needed)
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    // Validate configuration when first accessing client
    validateR2Config();

    r2Client = new S3Client({
      region: 'auto', // Cloudflare R2 uses 'auto' as region
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2Client;
}

export interface GraffitiData {
  id: number;
  posix: [number, number];
  description: string;
  images: string[];
  uploadDate: string;
  author: string;
}

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const METADATA_KEY = 'graffiti-metadata.json';

// Upload an image to R2 and return the public URL
export async function uploadImage(file: File, filename: string): Promise<string> {
  try {
    const client = getR2Client();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `images/${filename}`,
      Body: buffer,
      ContentType: file.type,
      ContentDisposition: 'inline',
    });

    await client.send(command);
    return `${PUBLIC_URL}/images/${filename}`;
  } catch (error) {
    handleR2Error(error, 'image upload');
  }
}

// Save graffiti metadata to R2
export async function saveGraffitiData(data: GraffitiData[]): Promise<void> {
  try {
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: METADATA_KEY,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    });

    await client.send(command);
  } catch (error) {
    handleR2Error(error, 'metadata save');
  }
}

// Load graffiti metadata from R2
export async function loadGraffitiData(): Promise<GraffitiData[]> {
  try {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: METADATA_KEY,
    });

    const response = await client.send(command);

    if (!response.Body) {
      // If no metadata file exists, return default data
      console.log('No metadata file found, returning default data');
      return getDefaultGraffitiData();
    }

    const streamToString = async (stream: any): Promise<string> => {
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString('utf-8');
    };

    const dataString = await streamToString(response.Body);
    return JSON.parse(dataString);
  } catch (error) {
    // If the error is because the file doesn't exist, return default data
    // Check for NoSuchKey error specifically by its name property
    if ((error as any).name === 'NoSuchKey') {
      console.log('Metadata file does not exist yet (NoSuchKey), returning default data');
      return getDefaultGraffitiData();
    }
    handleR2Error(error, 'metadata load');
  }
}

// Generate a unique filename for uploaded images
export function generateImageFilename(originalName: string, graffitiId: number, index: number): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop() || 'jpg';
  return `graffiti_${graffitiId}_${index}_${timestamp}.${extension}`;
}

// Delete an image from R2 storage
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    const client = getR2Client();

    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const key = `images/${filename}`;

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
    console.log(`Successfully deleted image: ${key}`);
  } catch (error) {
    console.error(`Error deleting image ${imageUrl}:`, error);
    // Don't throw error to prevent deletion from failing completely if some images can't be deleted
  }
}

// Delete all images associated with a graffiti entry
export async function deleteGraffitiImages(imageUrls: string[]): Promise<void> {
  const deletePromises = imageUrls
    .filter(url => url.startsWith(PUBLIC_URL)) // Only delete images from our R2 storage, not placeholder URLs
    .map(url => deleteImage(url));

  await Promise.allSettled(deletePromises);
}

// Default graffiti data for initial setup
function getDefaultGraffitiData(): GraffitiData[] {
  return [
    {
      id: 1,
      description: "Description for location 1",
      posix: [46.6707291, 11.1591838],
      author: "John Doe",
      uploadDate: "2024-01-15T10:30:00.000Z",
      images: [
        "https://placehold.co/400x800/orange/white?text=Image+1",
        "https://placehold.co/400x100/orange/white?text=Image+2",
        "https://placehold.co/400x300/orange/white?text=Image+3",
        "https://placehold.co/100x400/orange/white?text=Marker"
      ]
    },
    {
      id: 2,
      description: "Description for location 2",
      posix: [46.6701290, 11.1598140],
      author: "Jane Smith",
      uploadDate: "2024-02-20T14:45:00.000Z",
      images: [
        "https://placehold.co/400x300/red/white?text=Image+1",
        "https://placehold.co/400x200/red/white?text=Image+2",
        "https://placehold.co/300x600/red/white?text=Marker"
      ]
    },
  ];
}
