// set_s3_cors.js
// Run: node server/scripts/set_s3_cors.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || 'us-east-1';

if (!bucket) {
  console.error('S3_BUCKET is not set in .env');
  process.exit(1);
}

const client = new S3Client({ region });

async function setCors() {
  const params = {
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ['http://localhost:3000'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  };

  try {
    console.log(`Setting CORS on bucket '${bucket}' in region '${region}'...`);
    const cmd = new PutBucketCorsCommand(params);
    const resp = await client.send(cmd);
    console.log('CORS set successfully:', resp);
  } catch (err) {
    console.error('Failed to set CORS:', err);
    process.exit(2);
  }
}

setCors();
