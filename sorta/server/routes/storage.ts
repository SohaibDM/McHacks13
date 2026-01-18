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
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: content_type || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Provide a presigned GET URL that Gumloop (or any third-party) can use to fetch the file.
    // Presigned GET is preferred over relying on public object URLs because objects uploaded via
    // presigned PUT are not public by default.
    const getCommand = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    // Also expose the canonical object URL (not encoded) for reference/debugging if needed.
    const objectUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

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
