import axios from 'axios';

const API_URL = 'http://localhost:5000/api/storage';

const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

export interface RunStatus {
  state: 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';
  outputs?: Record<string, any>;
}

// Upload a file with manual path selection
export const uploadManual = async (
  token: string,
  userId: string,
  fileName: string,
  path: string,
  fileUrl?: string
) => {
  const body: any = { user_id: userId, file_name: fileName, path };
  if (fileUrl) {
    body.file_url = fileUrl;
    body['file url'] = fileUrl;
  }

  const response = await axios.post(`${API_URL}/upload/manual`, body, {
    headers: getHeaders(token)
  });
  return response.data;
};

// Upload a file with AI auto-sorting
export const uploadAuto = async (
  token: string,
  userId: string,
  fileName: string,
  description?: string,
  fileUrl?: string
) => {
  const body: any = { user_id: userId, file_name: fileName, description };
  if (fileUrl) {
    body.file_url = fileUrl;
    body['file url'] = fileUrl;
  }

  const response = await axios.post(`${API_URL}/upload/auto`, body, {
    headers: getHeaders(token)
  });
  return response.data;
};

// Upload raw file to backend which will upload it to a public host and return a URL
export const uploadFile = async (
  token: string,
  file: File
): Promise<{ file_url: string; file_name: string }> => {
  const fd = new FormData();
  fd.append('file', file, file.name);

  const response = await axios.post(`${API_URL}/upload_file`, fd, {
    headers: {
      ...getHeaders(token),
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

// Request a presigned PUT URL from backend for direct S3 upload
export const presignUpload = async (
  token: string,
  userId: string,
  fileName: string,
  contentType?: string
): Promise<{ upload_url: string; object_url: string; download_url?: string; key: string }> => {
  const response = await axios.post(`${API_URL}/presign`,
    { user_id: userId, file_name: fileName, content_type: contentType },
    { headers: getHeaders(token) }
  );
  return response.data;
};

// Upload file buffer directly to S3 presigned URL
export const uploadToS3Presigned = async (
  uploadUrl: string,
  file: File
): Promise<void> => {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type || 'application/octet-stream'
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
};

// Create a new folder
export const createFolder = async (
  token: string,
  userId: string,
  path: string
) => {
  const response = await axios.post(`${API_URL}/folder`, 
    { user_id: userId, path },
    { headers: getHeaders(token) }
  );
  return response.data;
};

// Get the file structure for a user
export const getStructure = async (
  token: string,
  userId: string
): Promise<{ success: boolean; tree: FileNode[]; raw_paths?: string[] }> => {
  const response = await axios.post(`${API_URL}/structure`, 
    { user_id: userId },
    { headers: getHeaders(token) }
  );
  return response.data;
};

// Get the current status of a run
export const getRunStatus = async (
  token: string,
  runId: string
): Promise<RunStatus> => {
  const response = await axios.get(`${API_URL}/run`, {
    params: { run_id: runId },
    headers: getHeaders(token)
  });
  return response.data;
};

// Poll until a run is complete (with optional callback for progress)
export const pollRun = async (
  token: string,
  runId: string,
  onProgress?: (status: RunStatus) => void
): Promise<RunStatus> => {
  const response = await axios.get(`${API_URL}/run/poll`, {
    params: { run_id: runId },
    headers: getHeaders(token)
  });
  return response.data;
};

// Kill a running job
export const killRun = async (
  token: string,
  runId: string
): Promise<{ success: boolean }> => {
  const response = await axios.post(`${API_URL}/kill`,
    { run_id: runId },
    { headers: getHeaders(token) }
  );
  return response.data;
};

// Initialize a user's S3 storage folder
export const initStorage = async (
  token: string,
  userId: string
): Promise<{ run_id: string }> => {
  const response = await axios.post(`${API_URL}/init`,
    { user_id: userId },
    { headers: getHeaders(token) }
  );
  return response.data;
};

// Utility: Get parsed file tree
export const getFileTree = async (
  token: string,
  userId: string
): Promise<FileNode[]> => {
  // Call structure endpoint which polls internally and returns tree
  const result = await getStructure(token, userId);
  
  if (result.success && result.tree) {
    const tree = result.tree as any;

    // If backend returned the root node object, return its children
    if (!Array.isArray(tree) && tree.children && Array.isArray(tree.children)) {
      return tree.children as FileNode[];
    }

    // If backend returned an array already, return it
    if (Array.isArray(tree)) {
      return tree as FileNode[];
    }

    // If it's a single node without children, wrap it
    if (typeof tree === 'object') {
      return [tree as FileNode];
    }
  }

  throw new Error('Failed to get file structure');
};
