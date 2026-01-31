// 简单的 S3 上传测试
require('dotenv').config({ path: '.env' });
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

async function testUpload() {
  const region = process.env.AWS_REGION || process.env.S3_REGION || 'ap-southeast-1';
  const bucket = process.env.S3_BUCKET || 'transfer-upload-bin';
  
  const s3Client = new S3Client({
    region: region,
  });
  
  console.log('📦 测试上传到 S3...');
  console.log(`   存储桶: ${bucket}`);
  console.log(`   区域: ${region}\n`);
  
  const testKey = `uploads/test-${Date.now()}.txt`;
  const testContent = Buffer.from('S3 upload test - ' + new Date().toISOString());
  
  try {
    // 上传
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });
    
    await s3Client.send(putCommand);
    console.log(`✅ 上传成功！`);
    console.log(`   文件路径: ${testKey}\n`);
    
    // 清理
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: testKey,
      });
      await s3Client.send(deleteCommand);
      console.log(`✅ 已清理测试文件`);
    } catch (e) {
      console.log(`⚠️  无法清理测试文件（不影响）`);
    }
    
    console.log('\n✅ S3 上传功能正常！可以正常使用。');
    
  } catch (error) {
    console.log(`❌ 上传失败: ${error.name || error.message}`);
    if (error.$metadata) {
      console.log(`   状态码: ${error.$metadata.httpStatusCode}`);
    }
    if (error.message && (error.message.includes('Access Denied') || error.message.includes('Forbidden'))) {
      console.log('\n   提示: IAM 角色需要以下权限：');
      console.log('   - s3:PutObject');
      console.log('   - s3:GetObject');
    }
  }
}

testUpload().catch(console.error);

