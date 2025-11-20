import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

// 初始化 S3 客户端
const s3Client = new S3Client({
  region: config.s3.region,
  credentials: config.s3.accessKeyId && config.s3.secretAccessKey ? {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  } : undefined,
});

/**
 * 上传文件到 S3
 * @param fileBuffer 文件缓冲区
 * @param fileName 文件名
 * @param contentType MIME 类型
 * @returns S3 对象键（key）
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    // 生成唯一的文件键（key）
    const timestamp = Date.now();
    const randomStr = Math.round(Math.random() * 1e9);
    const ext = fileName.split('.').pop() || '';
    const key = `${config.s3.folderPrefix || 'uploads'}/${timestamp}-${randomStr}.${ext}`;

    // 上传到 S3
    const command = new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // 设置 ACL 为公共读取（如果需要公开访问）
      // ACL: 'public-read',
    });

    await s3Client.send(command);

    // 返回 S3 对象键
    return key;
  } catch (error: any) {
    console.error('S3 上传失败:', error);
    throw new Error(`文件上传失败: ${error.message}`);
  }
}

/**
 * 获取 S3 文件的公开 URL
 * @param key S3 对象键
 * @returns 文件的公开 URL
 */
export function getS3PublicUrl(key: string): string {
  if (config.s3.publicUrl) {
    // 如果配置了自定义公共 URL（如 CloudFront）
    return `${config.s3.publicUrl}/${key}`;
  }
  
  // 默认使用 S3 的公共 URL 格式
  return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
}

/**
 * 获取 S3 文件的预签名 URL（用于私有文件）
 * @param key S3 对象键
 * @param expiresIn 过期时间（秒），默认 1 小时
 * @returns 预签名 URL
 */
export async function getS3PresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error: any) {
    console.error('生成预签名 URL 失败:', error);
    throw new Error(`生成文件访问链接失败: ${error.message}`);
  }
}

