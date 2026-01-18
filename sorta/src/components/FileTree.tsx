import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFileTree, FileNode } from '../services/storageApi';
import './FileTree.css';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  aiSorted?: boolean;
  aiReason?: string;
  children?: FileItem[];
}

// Convert FileNode from API to FileItem
const convertToFileItem = (node: FileNode, idPrefix: string = ''): FileItem => {
  const id = idPrefix + node.path;
  return {
    id,
    name: node.name,
    type: node.type,
    path: node.path,
    children: node.children?.map((child, i) => convertToFileItem(child, id + '_' + i))
  };
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return <FileImage size={16} />;
    case 'mp4':
    case 'mov':
    case 'avi':
      return <FileVideo size={16} />;
    case 'mp3':
    case 'wav':
      return <FileAudio size={16} />;
    case 'zip':
    case 'rar':
    case '7z':
      return <FileArchive size={16} />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
      return <FileCode size={16} />;
    default:
      return <FileText size={16} />;
  }
};

interface FileTreeProps {
  onFileSelect: (file: any) => void;
  onFolderSelect: (folder: any) => void;
  selectedFolder: any;
}

const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, onFolderSelect, selectedFolder }) => {
  const { user, token } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const loadFiles = async () => {
    if (!user || !token) return;

    setLoading(true);
    setError(null);

    try {
      const tree = await getFileTree(token, user.id);
      const items = tree.map((node, i) => convertToFileItem(node, 'root_' + i));
      setFiles(items);
      
      // Auto-expand root folders
      const rootIds = items.filter(i => i.type === 'folder').map(i => i.id);
      setExpandedFolders(new Set(rootIds));
    } catch (err: any) {
      console.error('Failed to load files:', err);
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [user, token]);

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const renderItem = (item: FileItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="file-tree-item-wrapper">
        <div
          className={`file-tree-item ${item.type}`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.id);
              onFolderSelect(item);
            } else {
              onFileSelect(item);
            }
          }}
        >
          <div className="item-icon">
            {item.type === 'folder' ? (
              <>
                {hasChildren && (
                  isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                )}
                <Folder size={18} />
              </>
            ) : (
              getFileIcon(item.name)
            )}
          </div>
          
          <span className="item-name">{item.name}</span>
          
          {item.aiSorted && (
            <span className="ai-badge" title={item.aiReason}>
              AI
            </span>
          )}
        </div>

        {item.type === 'folder' && isExpanded && item.children && (
          <div className="folder-children">
            {item.children.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <h2>Files</h2>
        <button className="refresh-button" onClick={loadFiles} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <div className="file-tree-content">
        {loading && files.length === 0 ? (
          <div className="file-tree-loading">
            <Loader2 size={24} className="spin" />
            <span>Loading files...</span>
          </div>
        ) : error ? (
          <div className="file-tree-error">
            <AlertCircle size={24} />
            <span>{error}</span>
            <button onClick={loadFiles}>Retry</button>
          </div>
        ) : files.length === 0 ? (
          <div className="file-tree-empty">
            <Folder size={32} />
            <span>No files yet</span>
            <p>Upload your first file to get started</p>
          </div>
        ) : (
          files.map(item => renderItem(item))
        )}
      </div>
    </div>
  );
};

export default FileTree;
