// S3 连接测试脚本
// 在 EC2 上运行：node test-s3-connection.js

require('dotenv').config({ path: '.env' });
const { S3Client, ListBucketsCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
  console.log('🔍 测试 S3 连接...\n');
  
  // 读取配置
  const region = process.env.AWS_REGION || process.env.S3_REGION || 'ap-southeast-1';
  const bucket = process.env.S3_BUCKET || '';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '';
  const enabled = process.env.S3_ENABLED === 'true';
  
  console.log('📋 配置信息：');
  console.log(`  S3_ENABLED: ${enabled}`);
  console.log(`  AWS_REGION: ${region}`);
  console.log(`  S3_BUCKET: ${bucket}`);
  console.log(`  AWS_ACCESS_KEY_ID: ${accessKeyId ? accessKeyId.substring(0, 10) + '...' : '未配置（可能使用 IAM 角色）'}`);
  console.log(`  AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? '已配置' : '未配置（可能使用 IAM 角色）'}`);
  console.log('');
  
  if (!enabled) {
    console.log('❌ S3 未启用（S3_ENABLED 不是 true）');
    return;
  }
  
  if (!bucket) {
    console.log('❌ S3_BUCKET 未配置');
    return;
  }
  
  // 创建 S3 客户端
  const s3Client = new S3Client({
    region: region,
    credentials: accessKeyId && secretAccessKey ? {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    } : undefined, // 如果未配置凭证，尝试使用 IAM 角色或默认凭证链
  });
  
  try {
    // 测试 1: 列出存储桶（测试基本连接）
    console.log('📦 测试 1: 列出存储桶...');
    try {
      const listCommand = new ListBucketsCommand({});
      const response = await s3Client.send(listCommand);
      console.log('✅ S3 连接成功！');
      console.log(`   找到 ${response.Buckets?.length || 0} 个存储桶`);
      if (response.Buckets && response.Buckets.length > 0) {
        console.log('   存储桶列表：');
        response.Buckets.forEach(b => {
          console.log(`     - ${b.Name}${b.Name === bucket ? ' ✓ (当前配置的存储桶)' : ''}`);
        });
      }
      console.log('');
    } catch (error) {
      console.log('❌ 无法连接到 S3:', error.message);
      if (error.message.includes('credentials')) {
        console.log('   提示: 检查 AWS 访问凭证配置（AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY）');
        console.log('   或者确保 EC2 实例已附加 IAM 角色');
      }
      return;
    }
    
    // 测试 2: 检查存储桶是否存在和可访问
    console.log(`📦 测试 2: 检查存储桶 "${bucket}" 是否存在...`);
    try {
      const headCommand = new HeadBucketCommand({ Bucket: bucket });
      await s3Client.send(headCommand);
      console.log(`✅ 存储桶 "${bucket}" 存在且可访问！`);
      console.log('');
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log(`❌ 存储桶 "${bucket}" 不存在`);
        console.log('   提示: 检查 S3_BUCKET 配置是否正确');
      } else if (error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
        console.log(`⚠️  存储桶 "${bucket}" 存在但无访问权限`);
        console.log('   提示: 检查 IAM 用户/角色的权限');
      } else {
        console.log(`❌ 检查存储桶时出错: ${error.message}`);
      }
      return;
    }
    
    console.log('✅ S3 配置测试通过！可以正常使用 S3 存储。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('   错误详情:', error);
  }
}

testS3Connection().catch(console.error);

