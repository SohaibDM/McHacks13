/**
 * Gumloop API Client
 * 
 * Server-side only - never expose API key to frontend.
 * Handles async pipeline execution: start -> poll -> get outputs
 */

import axios, { AxiosInstance } from 'axios';

// ----- Types -----

export interface PipelineInput {
  input_name: string;
  value: string;
}

export interface StartFlowParams {
  savedItemId: string;
  userId?: string;
  projectId?: string;
  pipelineInputs: Record<string, string>;
}

export interface RunState {
  run_id: string;
  state: 'RUNNING' | 'DONE' | 'FAILED' | 'TERMINATED' | 'QUEUED' | string;
  outputs?: Record<string, any>;
  log?: string[];
  created_ts?: string;
  finished_ts?: string;
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

// ----- Flow IDs (saved_item_id) -----

export const FLOW_IDS = {
  UPLOAD_MANUAL: 'crDVFy7CqANjvoKkWyCbdN',
  UPLOAD_AUTO: 'wdSh1nkbEFwus4kHRWSX18',
  CREATE_FOLDER: '2fe4myZScFA8kYmYN2VgdG',
  GET_STRUCTURE: 'vkToNxWifgpDvhx9WbEotr',
} as const;

// ----- Gumloop Client Class -----

class GumloopClient {
  private client: AxiosInstance;
  private defaultUserId?: string;
  private defaultProjectId?: string;

  constructor() {
    const apiKey = process.env.GUMLOOP_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  GUMLOOP_API_KEY not set - Gumloop calls will fail');
    }

    this.client = axios.create({
      baseURL: 'https://api.gumloop.com/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey || ''}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.defaultUserId = process.env.GUMLOOP_USER_ID;
    this.defaultProjectId = process.env.GUMLOOP_PROJECT_ID;

    // Warn if neither is set
    if (!this.defaultUserId && !this.defaultProjectId) {
      console.warn('⚠️  GUMLOOP_USER_ID or GUMLOOP_PROJECT_ID must be set - get these from your Gumloop dashboard');
    }
  }

  /**
   * Convert { key: value } object to Gumloop pipeline_inputs format
   */
  private toPipelineInputs(inputs: Record<string, string>): PipelineInput[] {
    return Object.entries(inputs).map(([input_name, value]) => ({
      input_name,
      value: value ?? '',
    }));
  }

  /**
   * Start a pipeline flow
   */
  async startFlow(params: StartFlowParams): Promise<string> {
    const { savedItemId, userId, projectId, pipelineInputs } = params;

    const payload: any = {
      saved_item_id: savedItemId,
      pipeline_inputs: this.toPipelineInputs(pipelineInputs),
    };

    // Add user_id or project_id for Gumloop tracking
    if (userId || this.defaultUserId) {
      payload.user_id = userId || this.defaultUserId;
    }
    if (projectId || this.defaultProjectId) {
      payload.project_id = projectId || this.defaultProjectId;
    }

    try {
      const response = await this.client.post('/start_pipeline', payload);
      const runId = response.data?.run_id;
      
      if (!runId) {
        throw new Error('No run_id returned from Gumloop');
      }
      
      console.log(`🚀 Gumloop flow started: ${savedItemId} -> run_id: ${runId}`);
      return runId;
    } catch (error: any) {
      console.error('Gumloop startFlow error:', error.response?.data || error.message);
      throw new Error(`Failed to start Gumloop flow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get current run state
   */
  async getRun(runId: string, userId?: string, projectId?: string): Promise<RunState> {
    const params: any = { run_id: runId };
    
    if (userId || this.defaultUserId) {
      params.user_id = userId || this.defaultUserId;
    }
    if (projectId || this.defaultProjectId) {
      params.project_id = projectId || this.defaultProjectId;
    }

    try {
      const response = await this.client.get('/get_pl_run', { params });
      return {
        run_id: runId,
        state: response.data?.state || 'UNKNOWN',
        outputs: response.data?.outputs,
        log: response.data?.log,
        created_ts: response.data?.created_ts,
        finished_ts: response.data?.finished_ts,
      };
    } catch (error: any) {
      console.error('Gumloop getRun error:', error.response?.data || error.message);
      throw new Error(`Failed to get run status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Kill/cancel a running pipeline
   */
  async killRun(runId: string, userId?: string, projectId?: string): Promise<boolean> {
    const payload: any = { run_id: runId };
    
    if (userId || this.defaultUserId) {
      payload.user_id = userId || this.defaultUserId;
    }
    if (projectId || this.defaultProjectId) {
      payload.project_id = projectId || this.defaultProjectId;
    }

    try {
      await this.client.post('/kill_pipeline', payload);
      console.log(`🛑 Gumloop run killed: ${runId}`);
      return true;
    } catch (error: any) {
      console.error('Gumloop killRun error:', error.response?.data || error.message);
      throw new Error(`Failed to kill run: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Poll run until completion (DONE/FAILED/TERMINATED)
   */
  async pollRunUntilDone(
    runId: string,
    options: PollOptions = {},
    userId?: string,
    projectId?: string
  ): Promise<RunState> {
    const {
      intervalMs = 2000,
      timeoutMs = 300000, // 5 minutes default
      maxRetries = 150,
    } = options;

    const startTime = Date.now();
    let retries = 0;

    while (retries < maxRetries) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Polling timed out after ${timeoutMs}ms`);
      }

      const runState = await this.getRun(runId, userId, projectId);
      
      if (['DONE', 'FAILED', 'TERMINATED'].includes(runState.state)) {
        if (runState.state === 'FAILED') {
          throw new Error(`Pipeline failed: ${JSON.stringify(runState.log || runState.outputs)}`);
        }
        if (runState.state === 'TERMINATED') {
          throw new Error('Pipeline was terminated');
        }
        return runState;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      retries++;
    }

    throw new Error(`Max retries (${maxRetries}) exceeded while polling`);
  }

  // ----- High-level flow methods -----

  /**
   * Flow A: Upload file manually (user picks folder)
   */
  async uploadManual(appUserId: string, fileName: string, path: string, fileUrl?: string): Promise<string> {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    const inputs: Record<string, string> = {
      user_id: appUserId,
      file_name: fileName,
      description: '',
      path: normalizedPath,
    };

    if (fileUrl) {
      // include multiple keys to be resilient to different pipeline input names
      inputs['file url'] = fileUrl;
      inputs['file_url'] = fileUrl;
      inputs['file url'] = fileUrl;
    }

    return this.startFlow({
      savedItemId: FLOW_IDS.UPLOAD_MANUAL,
      pipelineInputs: inputs,
    });
  }

  /**
   * Flow B: Upload file with AI sorting
   */
  async uploadAuto(appUserId: string, fileName: string, description: string = '', fileUrl?: string): Promise<string> {
    const inputs: Record<string, string> = {
      user_id: appUserId,
      'file name': fileName,
      file_name: fileName,
      description: description,
      path: '',
    };

    if (fileUrl) {
      inputs['file url'] = fileUrl;
      inputs['file_url'] = fileUrl;
      inputs['file url'] = fileUrl;
    }

    return this.startFlow({
      savedItemId: FLOW_IDS.UPLOAD_AUTO,
      pipelineInputs: inputs,
    });
  }

  /**
   * Flow C: Create folder
   */
  async createFolder(appUserId: string, folderPath: string): Promise<string> {
    // Ensure path starts with /
    const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
    
    return this.startFlow({
      savedItemId: FLOW_IDS.CREATE_FOLDER,
      pipelineInputs: {
        'Folder path': normalizedPath,
        'user id': appUserId,
      },
    });
  }

  /**
   * Flow D: Get storage structure
   */
  async getStructure(appUserId: string): Promise<string> {
    return this.startFlow({
      savedItemId: FLOW_IDS.GET_STRUCTURE,
      pipelineInputs: {
        user_id: appUserId,
      },
    });
  }

  /**
   * Get structure and wait for result, then parse into tree
   */
  async getStructureAndParse(appUserId: string): Promise<{
    raw: string[];
    tree: FileTreeNode;
  }> {
    const runId = await this.getStructure(appUserId);
    const result = await this.pollRunUntilDone(runId, { intervalMs: 1000, timeoutMs: 60000 });
    
    // Extract the list of S3 URIs from outputs
    // Gumloop returns outputs from Output nodes - exact key depends on node name
    let rawList: string[] = [];
    
    if (result.outputs) {
      // Try common output keys
      const outputValue = result.outputs.output || result.outputs.result || result.outputs.list || Object.values(result.outputs)[0];
      
      if (Array.isArray(outputValue)) {
        rawList = outputValue;
      } else if (typeof outputValue === 'string') {
        // Might be JSON string
        try {
          rawList = JSON.parse(outputValue);
        } catch {
          // Or newline-separated
          rawList = outputValue.split('\n').filter(Boolean);
        }
      }
    }

    const tree = parseS3ListToTree(rawList, appUserId);
    return { raw: rawList, tree };
  }
}

// ----- File Tree Types & Parser -----

export interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string; // Full path from user root (e.g., "/Documents/file.pdf")
  s3Key?: string; // Original S3 key for operations
  children?: FileTreeNode[];
  aiSorted?: boolean;
}

/**
 * Parse list of S3 URIs into a hierarchical tree structure
 * 
 * Input: ['s3://mchacks13/userId/folder/file.pdf', ...]
 * Output: Tree with root labeled "My Storage"
 */
export function parseS3ListToTree(s3Uris: string[], userId: string): FileTreeNode {
  const bucket = 'mchacks13';
  const prefix = `s3://${bucket}/${userId}/`;

  // Root node
  const root: FileTreeNode = {
    id: 'root',
    name: 'My Storage',
    type: 'folder',
    path: '/',
    children: [],
  };

  // Map to track created folders
  const folderMap = new Map<string, FileTreeNode>();
  folderMap.set('/', root);

  for (const uri of s3Uris) {
    // Skip if not matching our bucket/user
    if (!uri.startsWith(prefix)) continue;

    // Get path relative to user root
    const relativePath = uri.slice(prefix.length);
    if (!relativePath) continue;

    // Skip .keep placeholder files in display (but folder still exists)
    const isKeepFile = relativePath.endsWith('.keep') || relativePath.endsWith('/.keep');
    
    const parts = relativePath.split('/').filter(Boolean);
    let currentPath = '';
    let parentNode = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath += '/' + part;

      // Check if this node already exists
      let existingNode = parentNode.children?.find(c => c.name === part);

      if (!existingNode) {
        // Determine if file or folder
        // Last part without extension or ending with / is a folder
        // Last part with extension is a file
        const isFolder = !isLast || 
          uri.endsWith('/') || 
          (isLast && isKeepFile); // .keep indicates folder exists

        // Skip adding .keep files to display
        if (isLast && isKeepFile) {
          continue;
        }

        const newNode: FileTreeNode = {
          id: `${userId}${currentPath}`.replace(/[^a-zA-Z0-9]/g, '_'),
          name: part,
          type: isFolder ? 'folder' : 'file',
          path: currentPath,
          s3Key: uri,
          children: isFolder ? [] : undefined,
        };

        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(newNode);
        existingNode = newNode;

        if (isFolder) {
          folderMap.set(currentPath, newNode);
        }
      }

      if (existingNode.type === 'folder') {
        parentNode = existingNode;
      }
    }
  }

  // Sort children: folders first, then files, alphabetically
  const sortChildren = (node: FileTreeNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  };
  sortChildren(root);

  return root;
}

// ----- Singleton Export -----

const gumloopClient = new GumloopClient();
export default gumloopClient;
