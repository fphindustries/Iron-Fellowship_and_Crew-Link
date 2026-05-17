import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET');
    this.s3 = new S3Client({
      endpoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
      region: config.get<string>('MINIO_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async createUploadUrl(key: string, contentType: string, maxSizeMb = 5) {
    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, maxSizeMb * 1024 * 1024],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: 300,
    });
    return { uploadUrl: url, fields, key };
  }

  async getDownloadUrl(key: string) {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 },
    );
    return { url };
  }

  async deleteObject(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
