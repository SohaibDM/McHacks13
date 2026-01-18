import React, { useState, useEffect, useRef } from 'react';
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
import { getFileTree, FileNode, getDownloadUrl, getPreviewUrl, deleteItem, moveItem, copyItem, pollRun } from '../services/storageApi';
import DestinationModal from './DestinationModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import UploadModal from './UploadModal';
import './FileTree.css';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  s3Key?: string;
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
    s3Key: (node as any).s3Key || undefined,
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
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item?: FileItem | null;
  }>({ visible: false, x: 0, y: 0, item: null });

  const [destModal, setDestModal] = useState<{ visible: boolean; action: 'move' | 'copy' | null; item?: FileItem | null }>({ visible: false, action: null, item: null });
  const [busy, setBusy] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; item?: FileItem | null }>({ visible: false, item: null });

  // Toggle global cursor when busy
  React.useEffect(() => {
    const prev = document.body.style.cursor;
    if (busy) {
      document.body.style.cursor = 'wait';
    } else {
      document.body.style.cursor = '';
    }
    return () => { document.body.style.cursor = prev; };
  }, [busy]);

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

  // ref for context menu container so we can detect outside clicks
  const menuRef = useRef<HTMLDivElement | null>(null);

  // hide context menu when clicking elsewhere or pressing Escape
  React.useEffect(() => {
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) return;
      setContextMenu({ visible: false, x: 0, y: 0, item: null });
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu({ visible: false, x: 0, y: 0, item: null }); };
    const onScroll = () => setContextMenu({ visible: false, x: 0, y: 0, item: null });

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  // Find folder by path recursively
  const findFolderByPath = (nodes: FileItem[], path: string): FileItem | null => {
    for (const n of nodes) {
      if (n.type === 'folder') {
        if (n.path === path) return n;
        if (n.children) {
          const found = findFolderByPath(n.children, path);
          if (found) return found;
        }
      }
    }
    return null;
  };

  const getCurrentItems = (): FileItem[] => {
    if (currentPath === '/' || !currentPath) return files;
    const found = findFolderByPath(files, currentPath);
    return found?.children || [];
  };

  const breadcrumbParts = () => {
    if (!currentPath || currentPath === '/') return [{ name: 'Home', path: '/' }];
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ name: 'Home', path: '/' }];
    let acc = '';
    parts.forEach(p => {
      acc += `/${p}`;
      crumbs.push({ name: p, path: acc });
    });
    return crumbs;
  };

  // Card-based renderer
  // Card-based renderer
  const renderCard = (item: FileItem) => {
    return (
      <div
        key={item.id}
        className={`card ${item.type}`}
        onClick={() => {
          if (item.type === 'folder') {
            setCurrentPath(item.path);
            onFolderSelect(item);
          } else {
            onFileSelect(item);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item });
        }}
      >
        <div className="card-icon">{item.type === 'folder' ? <Folder size={24} /> : getFileIcon(item.name)}</div>
        <div className="card-name" title={item.name}>{item.name}</div>
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
          <>
            <div className="file-tree-breadcrumbs">
              {breadcrumbParts().map((c, i, arr) => (
                <span key={c.path + i} className="breadcrumb-item">
                  <button
                    className="breadcrumb"
                    onClick={() => setCurrentPath(c.path)}
                  >
                    {c.name}
                  </button>
                  {i < arr.length - 1 && (
                    <span className="breadcrumb-sep">&gt;</span>
                  )}
                </span>
              ))}
            </div>

            <div className="cards">
              {getCurrentItems().map(item => renderCard(item))}

              <div className="card add-card" onClick={() => setShowUploadModal(true)}>
                <div className="card-icon">+</div>
                <div className="card-name">Add</div>
              </div>
            </div>
          </>
        )}
      </div>

      {contextMenu.visible && contextMenu.item && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 240), top: Math.min(contextMenu.y, window.innerHeight - 220) }}
        >
          {contextMenu.item.type === 'folder' ? (
            <>
              <button className="context-item" onClick={() => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                setCurrentPath(item.path);
                onFolderSelect(item);
              }}>Open</button>

              <div className="context-sep" />
              <button className="context-item" disabled={busy} onClick={() => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                setDestModal({ visible: true, action: 'move', item });
              }}>Move</button>
              <button className="context-item" disabled={busy} onClick={() => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                setDestModal({ visible: true, action: 'copy', item });
              }}>Copy</button>
              <button className="context-item danger" disabled={busy} onClick={() => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                setDeleteModal({ visible: true, item });
              }}>Delete</button>
            </>
          ) : (
            <>
              <button className="context-item" disabled={busy} onClick={async () => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                try {
                  const resp = await getPreviewUrl(token!, { s3_uri: item.s3Key, user_id: user!.id, path: item.path, filename: item.name });
                  window.open(resp.download_url, '_blank', 'noopener,noreferrer');
                } catch (err) { console.error('Preview failed', err); }
              }}>View</button>

              <button className="context-item" disabled={busy} onClick={async () => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                try {
                  const resp = await getDownloadUrl(token!, { s3_uri: item.s3Key, user_id: user!.id, path: item.path });
                  const a = document.createElement('a');
                  a.href = resp.download_url;
                  a.download = item.name;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                } catch (err) { console.error('Download failed', err); }
              }}>Download</button>

              <div className="context-sep" />
              <button className="context-item" disabled={busy} onClick={() => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                setDestModal({ visible: true, action: 'move', item });
              }}>Move</button>
              <button className="context-item" disabled={busy} onClick={() => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                setDestModal({ visible: true, action: 'copy', item });
              }}>Copy</button>
              <button className="context-item danger" disabled={busy} onClick={() => {
                const item = contextMenu.item!;
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
                setDeleteModal({ visible: true, item });
              }}>Delete</button>
            </>
          )}
        </div>
      )}

      {/* Destination chooser modal for Move/Copy */}
      <DestinationModal
        visible={!!destModal.visible}
        tree={files}
        title={destModal.action === 'move' ? 'Move To' : 'Copy To'}
        onClose={() => setDestModal({ visible: false, action: null, item: null })}
        onConfirm={async (destination: string) => {
          const modalItem = destModal.item!;
          setDestModal({ visible: false, action: null, item: null });
          setBusy(true);
          try {
            if (destModal.action === 'move') {
              const resp = await moveItem(token!, user!.id, modalItem.path, destination);
              if (resp.run_id) await pollRun(token!, resp.run_id);
            } else if (destModal.action === 'copy') {
              const resp = await copyItem(token!, user!.id, modalItem.path, destination);
              if (resp.run_id) await pollRun(token!, resp.run_id);
            }
            await loadFiles();
          } catch (err) {
            console.error('Destination action failed', err);
            alert('Operation failed');
          } finally {
            setBusy(false);
          }
        }}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        visible={!!deleteModal.visible}
        itemName={deleteModal.item?.name}
        onClose={() => setDeleteModal({ visible: false, item: null })}
        onConfirm={async () => {
          const item = deleteModal.item!;
          setDeleteModal({ visible: false, item: null });
          setBusy(true);
          try {
            const resp = await deleteItem(token!, user!.id, item.path);
            if (resp.run_id) await pollRun(token!, resp.run_id);
            await loadFiles();
          } catch (err) {
            console.error('Delete failed', err);
            alert('Delete failed');
          } finally {
            setBusy(false);
          }
        }}
      />

      {showUploadModal && (
        <UploadModal
          folder={{ name: currentPath === '/' ? 'My Files' : currentPath.split('/').pop(), path: currentPath }}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => { setShowUploadModal(false); loadFiles(); }}
        />
      )}
    </div>
  );
};

export default FileTree;
