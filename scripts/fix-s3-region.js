// 检查存储桶的实际区域
require('dotenv').config({ path: '.env' });
const { S3Client, GetBucketLocationCommand } = require('@aws-sdk/client-s3');

async function checkBucketRegion() {
  const bucket = process.env.S3_BUCKET || 'transfer-upload-bin';
  
  // 使用 us-east-1 作为默认区域（GetBucketLocation 需要）
  const s3Client = new S3Client({
    region: 'us-east-1',
  });
  
  console.log(`🔍 检查存储桶 "${bucket}" 的实际区域...\n`);
  
  try {
    const command = new GetBucketLocationCommand({ Bucket: bucket });
    const response = await s3Client.send(command);
    
    const actualRegion = response.LocationConstraint || 'us-east-1';
    const configuredRegion = process.env.AWS_REGION || process.env.S3_REGION || 'ap-southeast-1';
    
    console.log(`📋 区域信息：`);
    console.log(`   配置的区域: ${configuredRegion}`);
    console.log(`   实际区域: ${actualRegion}\n`);
    
    if (actualRegion !== configuredRegion) {
      console.log(`❌ 区域不匹配！`);
      console.log(`\n💡 修复方法：`);
      console.log(`   在 .env 文件中将 AWS_REGION 改为：`);
      console.log(`   AWS_REGION=${actualRegion}\n`);
    } else {
      console.log(`✅ 区域配置正确！`);
    }
    
  } catch (error) {
    console.log(`❌ 检查失败: ${error.name || error.message}`);
    if (error.$metadata) {
      console.log(`   状态码: ${error.$metadata.httpStatusCode}`);
    }
  }
}

checkBucketRegion().catch(console.error);

