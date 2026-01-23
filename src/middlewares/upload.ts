import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { uploadToS3, getS3PublicUrl } from '../services/s3Service';

// 扩展 Express.Multer.File 类型
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        filename: string;
        s3Key?: string; // S3 对象键
        s3Url?: string; // S3 公开 URL
      }
    }
  }
}

// 如果启用 S3，使用内存存储；否则使用磁盘存储
let storage: multer.StorageEngine;

if (config.s3.enabled) {
  // 使用内存存储（文件将直接上传到 S3）
  storage = multer.memoryStorage();
} else {
  // 使用磁盘存储（本地存储）
const uploadDir = config.upload.dest;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

  storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳 + 随机字符串 + 原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});
}

// 文件过滤器：只允许图片
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('请上传 JPG、PNG、GIF 或 WebP 格式的图片文件'));
  }
};

// 创建 multer 实例
const multerInstance = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxSize, // 5MB
  },
});

// 中间件：处理单文件上传
export const upload = multerInstance.single.bind(multerInstance);

/**
 * Create an upload middleware for a given field name, and (optionally) upload to S3 if enabled.
 * This keeps Phase-2 modules (e.g. Service Booking) isolated while reusing the same upload pipeline.
 */
export const uploadWithS3Field = (fieldName: string) => {
  return async (req: any, res: any, next: any) => {
    multerInstance.single(fieldName)(req, res, async (err: any) => {
      if (err) {
        return next(err);
      }

      // If S3 is enabled and we have a file, upload the in-memory buffer to S3
      if (config.s3.enabled && req.file) {
        try {
          const fileBuffer = req.file.buffer;
          const fileName = req.file.originalname;
          const contentType = req.file.mimetype;

          const s3Key = await uploadToS3(fileBuffer, fileName, contentType);
          req.file.s3Key = s3Key;

          if (config.s3.publicAccess) {
            req.file.s3Url = getS3PublicUrl(s3Key);
          }

          // For compatibility, set filename to the S3 key
          req.file.filename = s3Key;
        } catch (s3Error: any) {
          console.error('S3 上传失败:', s3Error);
          return next(new Error(`文件上传到 S3 失败: ${s3Error.message}`));
        }
      }

      next();
    });
  };
};

// 中间件：处理单文件上传并自动上传到 S3（如果启用）
export const uploadWithS3 = async (req: any, res: any, next: any) => {
  return uploadWithS3Field('payment_screenshot')(req, res, next);
};

