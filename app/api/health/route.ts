import { NextResponse } from 'next/server';
import { loadGraffitiData } from '@/lib/r2-storage';

export const runtime = 'edge';

export async function GET() {
  try {
    // Test R2 connectivity by trying to load data
    await loadGraffitiData();

    return NextResponse.json({
      status: 'healthy',
      message: 'R2 storage is connected and working',
      timestamp: new Date().toISOString(),
      r2Config: {
        bucketName: process.env.R2_BUCKET_NAME || 'not configured',
        accountId: process.env.R2_ACCOUNT_ID ? 'configured' : 'not configured',
        accessKey: process.env.R2_ACCESS_KEY_ID ? 'configured' : 'not configured',
        secretKey: process.env.R2_SECRET_ACCESS_KEY ? 'configured' : 'not configured',
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'unhealthy',
      message: 'R2 storage connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      r2Config: {
        bucketName: process.env.R2_BUCKET_NAME || 'not configured',
        accountId: process.env.R2_ACCOUNT_ID ? 'configured' : 'not configured',
        accessKey: process.env.R2_ACCESS_KEY_ID ? 'configured' : 'not configured',
        secretKey: process.env.R2_SECRET_ACCESS_KEY ? 'configured' : 'not configured',
      }
    }, { status: 500 });
  }
}
