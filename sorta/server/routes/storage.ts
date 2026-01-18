/**
 * Storage API Routes
 * 
 * Exposes Gumloop flows to frontend:
 * - POST /api/storage/upload/manual - Upload to specific folder
 * - POST /api/storage/upload/auto - Upload with AI sorting
 * - POST /api/storage/folder - Create folder
 * - GET /api/storage/structure - Get file tree
 * - GET /api/storage/run - Get run status
 * - POST /api/storage/kill - Cancel a run
 */

import { Router, Request, Response } from 'express';
import gumloopClient, { parseS3ListToTree } from '../lib/gumloop';
// Use multer for multipart parsing. Use require with @ts-ignore to avoid missing type errors in TS runtime.
// @ts-ignore
const multer = require('multer');
import axios from 'axios';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const upload = multer({ storage: multer.memoryStorage() });

// Initialize S3 client using environment variables
const S3_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
let s3Client: S3Client | null = null;
if (S3_REGION && S3_BUCKET) {
  s3Client = new S3Client({ region: S3_REGION });
} else {
  console.warn('S3_REGION or S3_BUCKET not set - presigned upload endpoint will be disabled');
}

// Create typed aliases so TypeScript can pass these into AWS SDK calls
// (the env vars are `string | undefined` by default).
const S3_REGION_NAME: string = S3_REGION || '';
const S3_BUCKET_NAME: string = S3_BUCKET || '';

const router = Router();

// ----- Upload Manual (user picks folder) -----
router.post('/upload/manual', async (req: Request, res: Response) => {
  try {
    const { user_id, file_name, path } = req.body;

    if (!user_id || !file_name || !path) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, file_name, path' 
      });
    }

    // Validate path starts with /
    if (!path.startsWith('/')) {
      return res.status(400).json({ error: 'Path must start with /' });
    }

    // pass file_url if provided
    const fileUrl = (req.body.file_url || req.body.file_url || req.body['file url']) as string | undefined;
    const runId = await gumloopClient.uploadManual(user_id, file_name, path, fileUrl);
    
    res.json({ 
      success: true, 
      run_id: runId,
      message: 'Upload started (manual placement)'
    });
  } catch (error: any) {
    console.error('Upload manual error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Upload Auto (AI sorting) -----
router.post('/upload/auto', async (req: Request, res: Response) => {
  try {
    const { user_id, file_name, description } = req.body;

    if (!user_id || !file_name) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, file_name' 
      });
    }

    const fileUrl = (req.body.file_url || req.body['file url']) as string | undefined;
    const runId = await gumloopClient.uploadAuto(
      user_id,
      file_name,
      description || '',
      fileUrl
    );
    
    res.json({ 
      success: true, 
      run_id: runId,
      message: 'Upload started (AI sorting)'
    });
  } catch (error: any) {
    console.error('Upload auto error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Upload raw file and return public URL -----
// This endpoint uploads the incoming file to a public temporary host (transfer.sh)
// and returns the generated file URL which Gumloop can access.
router.post('/upload_file', upload.single('file'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    // Upload to transfer.sh as a fallback public host
    const uploadUrl = `https://transfer.sh/${encodeURIComponent(fileName)}`;

    let response;
    try {
      response = await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'Content-Type': req.file.mimetype || 'application/octet-stream'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000,
      });
    } catch (err: any) {
      console.error('transfer.sh upload failed:', err.response?.status, err.response?.data || err.message);

      // Fallback: try 0x0.st (multipart/form-data)
      try {
        // @ts-ignore - use form-data package
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fileBuffer, { filename: fileName, contentType: req.file.mimetype });

        const fallbackResp = await axios.post('https://0x0.st', form, {
          headers: {
            ...form.getHeaders()
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 120000,
        });

        const fallbackUrl = typeof fallbackResp.data === 'string' ? fallbackResp.data.trim() : fallbackResp.data?.url;
        if (fallbackUrl) {
          return res.json({ success: true, file_url: fallbackUrl, file_name: fileName, provider: '0x0.st' });
        }
      } catch (fallbackErr: any) {
        console.error('0x0.st fallback failed:', fallbackErr.response?.status, fallbackErr.response?.data || fallbackErr.message);
      }

      return res.status(502).json({ error: 'Failed to upload file to public host', details: err.response?.data || err.message });
    }

    // transfer.sh returns the URL as plain text in the response body
    const fileUrl = typeof response.data === 'string' ? response.data.trim() : response.data?.url;

    if (!fileUrl) {
      console.error('transfer.sh returned unexpected response:', response.status, response.data);
      return res.status(502).json({ error: 'Public host returned unexpected response', details: response.data });
    }

    res.json({ success: true, file_url: fileUrl, file_name: fileName, provider: 'transfer.sh' });
  } catch (error: any) {
    console.error('File upload error:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// ----- S3 Presign Endpoint -----
// Returns a presigned PUT URL and the object URL for uploading directly to S3
router.post('/presign', async (req: Request, res: Response) => {
  try {
    if (!s3Client) {
      return res.status(500).json({ error: 'S3 client not configured' });
    }

    const { user_id, file_name, content_type } = req.body as any;
    if (!user_id || !file_name) {
      return res.status(400).json({ error: 'Missing required fields: user_id, file_name' });
    }

    const safeFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${user_id}/${Date.now()}_${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: content_type || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Provide a presigned GET URL that Gumloop (or any third-party) can use to fetch the file.
    // Presigned GET is preferred over relying on public object URLs because objects uploaded via
    // presigned PUT are not public by default.
    const getCommand = new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key });
    const downloadUrl = await getSignedUrl(s3Client!, getCommand, { expiresIn: 3600 });

    // Also expose the canonical object URL (not encoded) for reference/debugging if needed.
    const objectUrl = `https://${S3_BUCKET_NAME}.s3.${S3_REGION_NAME}.amazonaws.com/${key}`;

    res.json({ success: true, upload_url: uploadUrl, object_url: objectUrl, download_url: downloadUrl, key });
  } catch (error: any) {
    console.error('Presign error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate presigned URL', details: error.message });
  }
});

// ----- Create Folder -----
router.post('/folder', async (req: Request, res: Response) => {
  try {
    const { user_id, path } = req.body;

    if (!user_id || !path) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, path' 
      });
    }

    // Validate path starts with /
    if (!path.startsWith('/')) {
      return res.status(400).json({ error: 'Path must start with /' });
    }

    const runId = await gumloopClient.createFolder(user_id, path);
    
    res.json({ 
      success: true, 
      run_id: runId,
      message: 'Folder creation started'
    });
  } catch (error: any) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Delete File/Folder -----
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { user_id, path } = req.body;
    if (!user_id || !path) return res.status(400).json({ error: 'Missing required fields: user_id, path' });

    const runId = await gumloopClient.deleteFile(user_id, path);
    res.json({ success: true, run_id: runId, message: 'Delete started' });
  } catch (error: any) {
    console.error('Delete flow error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Move File -----
router.post('/move', async (req: Request, res: Response) => {
  try {
    const { user_id, path, destination } = req.body;
    if (!user_id || !path || !destination) return res.status(400).json({ error: 'Missing required fields: user_id, path, destination' });

    const runId = await gumloopClient.moveFile(user_id, path, destination);
    res.json({ success: true, run_id: runId, message: 'Move started' });
  } catch (error: any) {
    console.error('Move flow error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Copy File -----
router.post('/copy', async (req: Request, res: Response) => {
  try {
    const { user_id, path, destination } = req.body;
    if (!user_id || !path || !destination) return res.status(400).json({ error: 'Missing required fields: user_id, path, destination' });

    const runId = await gumloopClient.copyFile(user_id, path, destination);
    res.json({ success: true, run_id: runId, message: 'Copy started' });
  } catch (error: any) {
    console.error('Copy flow error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Get Structure (file tree) -----
router.post('/structure', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing required field: user_id' });
    }

    // Start the flow and poll until done
    const { raw, tree } = await gumloopClient.getStructureAndParse(user_id);
    
    res.json({ 
      success: true, 
      raw_paths: raw,
      tree: tree
    });
  } catch (error: any) {
    console.error('Get structure error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Get Run Status -----
router.get('/run', async (req: Request, res: Response) => {
  try {
    const { run_id } = req.query;

    if (!run_id || typeof run_id !== 'string') {
      return res.status(400).json({ error: 'Missing required query param: run_id' });
    }

    const runState = await gumloopClient.getRun(run_id);
    
    res.json({ 
      success: true, 
      ...runState
    });
  } catch (error: any) {
    console.error('Get run error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Generate presigned GET URL for an existing object -----
router.post('/download', async (req: Request, res: Response) => {
  try {
    if (!s3Client) return res.status(500).json({ error: 'S3 client not configured' });

    const { s3_uri, key, user_id, path } = req.body as any;

    let objectKey: string | undefined;
    let requestedBucket = S3_BUCKET_NAME; // default

    if (key) {
      objectKey = key;
    } else if (s3_uri) {
      // support s3://bucket/key and https://bucket.s3... URLs
      if (s3_uri.startsWith('s3://')) {
        const parts = s3_uri.replace('s3://', '').split('/');
        // first part is bucket name
        const bucketFromUri = parts.shift();
        if (bucketFromUri) requestedBucket = bucketFromUri;
        objectKey = parts.join('/');
      } else {
        try {
          const u = new URL(s3_uri);
          // If hostname looks like '<bucket>.s3...' extract bucket
          const hostParts = u.hostname.split('.');
          if (hostParts.length > 0 && hostParts[1] === 's3') {
            requestedBucket = hostParts[0];
          }
          objectKey = decodeURIComponent(u.pathname.replace(/^\//, ''));
        } catch (e) {
          objectKey = undefined;
        }
      }
    } else if (user_id && path) {
      // Build key from user_id and path
      const p = path.startsWith('/') ? path.slice(1) : path;
      objectKey = `${user_id}/${p}`;
    }

    if (!objectKey) return res.status(400).json({ error: 'Missing key or s3_uri or (user_id+path)' });

    const { HeadObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

    // Helper to check object existence in a given bucket
    const exists = async (bucketName: string, keyToCheck: string) => {
      try {
        await s3Client!.send(new HeadObjectCommand({ Bucket: bucketName, Key: keyToCheck }));
        return true;
      } catch (err: any) {
        return false;
      }
    };

    // Try requested bucket first
    let finalKey = objectKey;
    let finalBucket = requestedBucket;

    if (!(await exists(finalBucket, finalKey))) {
      // If not found in requested bucket, try to lookup within that bucket under the user prefix
      if (user_id) {
        const prefix = `${user_id}/`;
        try {
          const listResp: any = await s3Client!.send(new ListObjectsV2Command({ Bucket: finalBucket, Prefix: prefix, MaxKeys: 1000 }));
          const items: any[] = listResp.Contents || [];

          // Normalize helper: lowercase, replace + and %20 with space, remove punctuation
          const normalize = (s: string | undefined) => {
            if (!s) return '';
            let t = String(s);
            t = t.replace(/\+/g, ' ').replace(/%20/gi, ' ');
            try { t = decodeURIComponent(t); } catch { /* ignore */ }
            t = t.replace(/[^a-z0-9 ]/gi, ' ').toLowerCase().trim();
            t = t.replace(/\s+/g, ' ');
            return t;
          };

          const targetBaseRaw = finalKey.split('/').pop() || '';
          const targetNorm = normalize(targetBaseRaw);

          const candidates: { Key: string; LastModified?: Date }[] = [];
          for (const it of items) {
            if (!it || !it.Key) continue;
            const fullKey: string = it.Key;
            const base = fullKey.split('/').pop() || '';
            const baseNoTs = base.replace(/^\d+_/, '');
            const candNorm = normalize(baseNoTs);
            if (candNorm && targetNorm && candNorm === targetNorm) {
              candidates.push({ Key: fullKey, LastModified: it.LastModified });
              continue;
            }
            const decodedBase = base.replace(/\+/g, ' ');
            if (decodedBase.endsWith(targetBaseRaw) || decodedBase === targetBaseRaw) {
              candidates.push({ Key: fullKey, LastModified: it.LastModified });
            }
          }

          if (candidates.length === 1) {
            finalKey = candidates[0].Key;
          } else if (candidates.length > 1) {
            candidates.sort((a, b) => {
              const ta = a.LastModified ? new Date(a.LastModified).getTime() : 0;
              const tb = b.LastModified ? new Date(b.LastModified).getTime() : 0;
              return tb - ta;
            });
            finalKey = candidates[0].Key;
          } else {
            const simpleMatch = items.find((it: any) => it.Key && it.Key.endsWith(targetBaseRaw));
            if (simpleMatch && simpleMatch.Key) finalKey = simpleMatch.Key;
          }
        } catch (listErr: any) {
          console.warn('Failed to list objects for fallback lookup:', listErr?.message || listErr);
        }
      }

      // If still not found, and there's a configured secondary bucket, try that bucket
      const secondary = process.env.SECONDARY_S3_BUCKET;
      // compute original object basename for safer matching in nested callbacks
      const originalBase = objectKey ? (objectKey.split('/').pop() || '') : '';
      if (secondary && secondary !== finalBucket) {
        try {
          if (await exists(secondary, finalKey)) {
            finalBucket = secondary;
          } else if (user_id) {
            // list in secondary bucket
            const prefix2 = `${user_id}/`;
            const listResp2: any = await s3Client!.send(new ListObjectsV2Command({ Bucket: secondary, Prefix: prefix2, MaxKeys: 1000 }));
            const items2: any[] = listResp2.Contents || [];
            const match2 = items2.find((it: any) => it.Key && (it.Key.endsWith(finalKey.split('/').pop() || '') || it.Key.endsWith(originalBase)));
            if (match2 && match2.Key) {
              finalKey = match2.Key;
              finalBucket = secondary;
            }
          }
        } catch (secErr: any) {
          console.warn('Secondary bucket lookup failed:', secErr?.message || secErr);
        }
      }
    }

    // Finally generate presigned GET for whatever finalKey and bucket we have
    const getCmd = new GetObjectCommand({ Bucket: finalBucket, Key: finalKey });
    const downloadUrl = await require('@aws-sdk/s3-request-presigner').getSignedUrl(s3Client!, getCmd, { expiresIn: 3600 });

    const objectUrl = `https://${finalBucket}.s3.${S3_REGION_NAME}.amazonaws.com/${encodeURIComponent(finalKey)}`;
    res.json({ success: true, download_url: downloadUrl, object_url: objectUrl, key: finalKey, bucket: finalBucket });
  } catch (error: any) {
    console.error('Download presign error:', error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to generate download URL', details: error.message });
  }
});

// ----- Poll Run Until Done -----
router.get('/run/poll', async (req: Request, res: Response) => {
  try {
    const { run_id } = req.query;

    if (!run_id || typeof run_id !== 'string') {
      return res.status(400).json({ error: 'Missing required query param: run_id' });
    }

    const runState = await gumloopClient.pollRunUntilDone(run_id, {
      intervalMs: 1500,
      timeoutMs: 120000, // 2 minutes max for poll endpoint
    });
    
    res.json({ 
      success: true, 
      ...runState
    });
  } catch (error: any) {
    console.error('Poll run error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Kill/Cancel Run -----
router.post('/kill', async (req: Request, res: Response) => {
  try {
    const { run_id } = req.body;

    if (!run_id) {
      return res.status(400).json({ error: 'Missing required field: run_id' });
    }

    await gumloopClient.killRun(run_id);
    
    res.json({ 
      success: true, 
      message: 'Run cancelled'
    });
  } catch (error: any) {
    console.error('Kill run error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Initialize User Storage (call on account creation) -----
router.post('/init', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing required field: user_id' });
    }

    // Create root folder for user in S3 via Gumloop
    const runId = await gumloopClient.createFolder(user_id, '/');
    
    // Wait for completion
    await gumloopClient.pollRunUntilDone(runId, {
      intervalMs: 1000,
      timeoutMs: 30000,
    });
    
    res.json({ 
      success: true, 
      message: 'User storage initialized'
    });
  } catch (error: any) {
    console.error('Init storage error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
