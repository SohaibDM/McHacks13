import React, { useState } from 'react';
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
  FileCode
} from 'lucide-react';
import './FileTree.css';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  aiSorted?: boolean;
  aiReason?: string;
  children?: FileItem[];
}

// Mock data - Replace with actual API call
const mockData: FileItem[] = [
  {
    id: '1',
    name: 'Work Documents',
    type: 'folder',
    children: [
      { id: '2', name: 'Q1 Report.pdf', type: 'file', aiSorted: true, aiReason: 'Sorted by date and topic' },
      { id: '3', name: 'Meeting Notes.docx', type: 'file' },
    ]
  },
  {
    id: '4',
    name: 'Personal',
    type: 'folder',
    children: [
      { id: '5', name: 'Photos', type: 'folder', children: [] },
      { id: '6', name: 'Receipts', type: 'folder', children: [] },
    ]
  },
  { id: '7', name: 'Tax Return 2025.pdf', type: 'file', aiSorted: true, aiReason: 'Organized by year and category' },
  { id: '8', name: 'Vacation Photo.jpg', type: 'file' },
];

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1', '4']));

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
      </div>
      <div className="file-tree-content">
        {mockData.map(item => renderItem(item))}
      </div>
    </div>
  );
};

export default FileTree;
