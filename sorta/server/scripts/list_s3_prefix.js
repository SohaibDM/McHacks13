// list_s3_prefix.js
// Usage: node server/scripts/list_s3_prefix.js <prefix> [match]

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET;
if (!region || !bucket) {
  console.error('AWS_REGION or S3_BUCKET not set in server/.env');
  process.exit(1);
}

const client = new S3Client({ region });

async function listPrefix(prefix, match) {
  console.log(`Listing objects under prefix: ${prefix} (bucket: ${bucket})`);
  try {
    let continuationToken;
    const all = [];
    do {
      const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken, MaxKeys: 1000 });
      const resp = await client.send(cmd);
      const items = resp.Contents || [];
      for (const it of items) {
        all.push({ Key: it.Key, LastModified: it.LastModified, Size: it.Size });
      }
      continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (continuationToken);

    if (match) {
      const lower = match.toLowerCase();
      const filtered = all.filter(a => (a.Key || '').toLowerCase().includes(lower));
      console.log(`Found ${filtered.length} matching objects:`);
      filtered.forEach(f => console.log(`- ${f.Key} (${f.Size} bytes) ${f.LastModified}`));
    } else {
      console.log(`Found ${all.length} objects:`);
      all.forEach(f => console.log(`- ${f.Key} (${f.Size} bytes) ${f.LastModified}`));
    }
  } catch (err) {
    console.error('List error:', err);
    process.exit(2);
  }
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node server/scripts/list_s3_prefix.js <prefix> [match]');
  process.exit(1);
}

listPrefix(args[0], args[1]);
