export class R2Error extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'R2Error';
  }
}

export function handleR2Error(error: unknown, operation: string): never {
  console.error(`R2 ${operation} failed:`, error);

  if (error instanceof Error) {
    // Check for common AWS/R2 error types
    if (error.message.includes('NoSuchBucket')) {
      throw new R2Error(`Bucket not found. Please check your R2_BUCKET_NAME configuration.`);
    }

    if (error.message.includes('AccessDenied')) {
      throw new R2Error(`Access denied. Please check your R2 credentials and permissions.`);
    }

    if (error.message.includes('InvalidAccessKeyId')) {
      throw new R2Error(`Invalid access key. Please check your R2_ACCESS_KEY_ID configuration.`);
    }

    if (error.message.includes('SignatureDoesNotMatch')) {
      throw new R2Error(`Invalid secret key. Please check your R2_SECRET_ACCESS_KEY configuration.`);
    }

    if (error.message.includes('NetworkingError') || error.message.includes('ENOTFOUND')) {
      throw new R2Error(`Network error. Please check your internet connection and R2_ACCOUNT_ID configuration.`);
    }

    throw new R2Error(`R2 ${operation} failed: ${error.message}`, error);
  }

  throw new R2Error(`R2 ${operation} failed with unknown error`, error);
}

export function validateR2Config(): void {
  const requiredEnvVars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new R2Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      `Please check your .env.local file and refer to R2_SETUP.md for setup instructions.`
    );
  }
}
