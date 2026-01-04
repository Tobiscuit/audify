const { S3Client, PutBucketLifecycleConfigurationCommand } = require('@aws-sdk/client-s3');

async function configureBucketPrivacy() {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'jrami-universal-polly-output';
    const client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    console.log(`Setting up Privacy Lifecycle Rules for bucket: ${bucketName}...`);

    const command = new PutBucketLifecycleConfigurationCommand({
        Bucket: bucketName,
        LifecycleConfiguration: {
            Rules: [
                {
                    ID: 'TempUploadsAutoCleanup',
                    Status: 'Enabled',
                    Prefix: 'temp-uploads/',
                    Expiration: {
                        Days: 1
                    }
                }
            ]
        }
    });

    try {
        await client.send(command);
        console.log('✅ SUCCESS: "Dead-Man Switch" enabled. Files in temp-uploads/ will autodelete after 24h.');
    } catch (error) {
        console.error('❌ ERROR: Could not set Lifecycle Policy.');
        console.error('Reason:', error.message);
        console.error('\nManual Instructions:');
        console.error('1. Go to S3 Console -> Management -> Lifecycle Rules');
        console.error('2. Create Rule "TempCleanup"');
        console.error('3. Prefix: "temp-uploads/" -> Expire current versions after 1 day.');
    }
}

configureBucketPrivacy();
