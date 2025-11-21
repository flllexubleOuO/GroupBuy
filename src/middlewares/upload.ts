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

// 中间件：处理单文件上传并自动上传到 S3（如果启用）
export const uploadWithS3 = async (req: any, res: any, next: any) => {
  multerInstance.single('payment_screenshot')(req, res, async (err: any) => {
    if (err) {
      return next(err);
    }

    // 如果启用了 S3 且有文件上传
    if (config.s3.enabled && req.file) {
      try {
        // 将内存中的文件上传到 S3
        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;
        const contentType = req.file.mimetype;

        const s3Key = await uploadToS3(fileBuffer, fileName, contentType);
        
        // 将 S3 信息附加到文件对象
        req.file.s3Key = s3Key;
        
        // 如果使用公共访问，生成公共 URL；否则只保存 key，稍后生成预签名 URL
        if (config.s3.publicAccess) {
          req.file.s3Url = getS3PublicUrl(s3Key);
        }
        
        // 为了兼容性，filename 设置为 S3 key（用于标识是 S3 文件）
        req.file.filename = s3Key;
      } catch (s3Error: any) {
        console.error('S3 上传失败:', s3Error);
        return next(new Error(`文件上传到 S3 失败: ${s3Error.message}`));
      }
    }

    next();
  });
};

