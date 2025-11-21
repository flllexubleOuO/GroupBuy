import { Request, Response } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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
 * 代理 S3 图片（仅允许后端访问 S3，前端通过后端获取图片）
 * 路由格式：/api/images/s3/:key
 * key 格式：uploads/timestamp-random.ext
 */
export const proxyS3Image = async (req: Request, res: Response) => {
  try {
    // 从路径参数获取 S3 key
    const key = req.params.key;
    
    if (!key) {
      return res.status(400).json({ error: '缺少文件路径' });
    }

    // 验证 key 格式（防止路径遍历攻击）
    if (key.includes('..') || key.startsWith('/')) {
      return res.status(400).json({ error: '无效的文件路径' });
    }

    // 从 S3 获取文件
    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    });

    const s3Response = await s3Client.send(command);

    // 设置响应头
    if (s3Response.ContentType) {
      res.setHeader('Content-Type', s3Response.ContentType);
    }
    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength.toString());
    }
    
    // 设置缓存头（可选）
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时

    // 将 S3 文件流传输到响应
    if (s3Response.Body) {
      // @ts-ignore - Body 可能是 ReadableStream
      s3Response.Body.pipe(res);
    } else {
      return res.status(404).json({ error: '文件不存在' });
    }
  } catch (error: any) {
    console.error('代理 S3 图片失败:', error);
    
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    return res.status(500).json({ error: '获取图片失败' });
  }
};

