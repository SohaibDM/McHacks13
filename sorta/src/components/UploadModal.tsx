import React, { useState } from 'react';
import { X, Upload, Sparkles, Folder, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadManual, uploadAuto, pollRun, presignUpload, uploadToS3Presigned, createFolder } from '../services/storageApi';
import './UploadModal.css';

interface UploadModalProps {
  folder: any;
  onClose: () => void;
  onUploadComplete?: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ folder, onClose, onUploadComplete }) => {
  const { user, token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'folder'>('file');
  const [newFolderName, setNewFolderName] = useState('');
  const [aiSort, setAiSort] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;

    if (activeTab === 'folder') {
      // Folder creation handled in separate handler
      return;
    }

    if (!file) return;

    setUploading(true);
    setStatus('Starting upload...');
    
    try {
      let result;
      
      // Request presigned S3 URL and upload directly to S3
      setStatus('Requesting presigned upload URL...');
      const presign = await presignUpload(token, user.id, file.name, file.type);
      setStatus('Uploading file to S3...');
      await uploadToS3Presigned(presign.upload_url, file);
      // Use the presigned GET URL so Gumloop can fetch the file even though the object is private
      const fileUrl = presign.download_url || presign.object_url;

      if (aiSort) {
        // Use AI auto-sorting
        setStatus('Starting AI sorting flow...');
        result = await uploadAuto(token, user.id, file.name, description || undefined, fileUrl);
      } else {
        // Manual path upload
        const uploadPath = folder?.path || '/';
        setStatus(`Starting manual upload to ${uploadPath}...`);
        result = await uploadManual(token, user.id, file.name, uploadPath, fileUrl);
      }

      // Poll for completion
      if (result.run_id) {
        setStatus('Processing...');
        const finalResult = await pollRun(token, result.run_id);
        
        if (finalResult.state === 'DONE') {
          setStatus('Upload complete!');
          onUploadComplete?.();
          setTimeout(() => onClose(), 1000);
        } else if (finalResult.state === 'FAILED') {
          setStatus('Upload failed. Please try again.');
          setUploading(false);
        }
      } else {
        setStatus('Upload complete!');
        onUploadComplete?.();
        setTimeout(() => onClose(), 1000);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus(error.response?.data?.error || 'Upload failed');
      setUploading(false);
    }
  };

  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !token) return;
    if (!newFolderName || newFolderName.trim() === '') return setStatus('Folder name required');

    setUploading(true);
    setStatus('Creating folder...');

    try {
      const basePath = folder?.path || '/';
      const normalizedBase = basePath === '/' ? '' : basePath.replace(/\/$/, '');
      const targetPath = `${normalizedBase}/${newFolderName}`.replace(/\/+/g, '/');
      // Ensure leading slash
      const pathForApi = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;

      const result = await createFolder(token, user.id, pathForApi);
      if (result.run_id) {
        setStatus('Creating folder (processing)...');
        const final = await pollRun(token, result.run_id);
        if (final.state === 'DONE') {
          setStatus('Folder created');
          onUploadComplete?.();
          setTimeout(() => onClose(), 800);
        } else {
          setStatus('Folder creation failed');
          setUploading(false);
        }
      } else {
        setStatus('Folder created');
        onUploadComplete?.();
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      console.error('Create folder error', err);
      setStatus(err?.response?.data?.error || 'Failed to create folder');
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{activeTab === 'file' ? 'Upload File' : 'Create Folder'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-tabs">
          <button type="button" className={`tab ${activeTab === 'file' ? 'active' : ''}`} onClick={() => setActiveTab('file')}>File</button>
          <button type="button" className={`tab ${activeTab === 'folder' ? 'active' : ''}`} onClick={() => setActiveTab('folder')}>Folder</button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {activeTab === 'file' ? (
            <>
              <div className="upload-area">
                <input
                  type="file"
                  id="file-input"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="file-input" className="file-label">
                  <Upload size={32} />
                  <span className="upload-text">
                    {file ? file.name : 'Click to select or drag file here'}
                  </span>
                  <span className="upload-subtext">
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Any file type supported'}
                  </span>
                </label>
              </div>

              <div className="form-section">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a brief description to help AI organize this file..."
                  rows={3}
                />
              </div>

              <div className="ai-sort-toggle">
                <div className="toggle-header">
                  <div className="toggle-info">
                    <Sparkles size={20} />
                    <div>
                      <h4>AI Smart Sort</h4>
                      <p>Let AI automatically organize this file</p>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={aiSort}
                      onChange={(e) => setAiSort(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              {!aiSort && (
                <div className="folder-select">
                  <Folder size={18} />
                  <span>Uploading to: {folder?.name || 'My Files'}</span>
                </div>
              )}
            </>
          ) : (
            <div className="folder-create">
              <div className="form-section">
                <label htmlFor="folderName">Folder name</label>
                <input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                />
                <p className="small">Parent: {folder?.path || '/'}</p>
              </div>
            </div>
          )}

          <div className="modal-actions">
            {status && (
              <span className="upload-status">
                {uploading && <Loader2 size={16} className="spin" />}
                {status}
              </span>
            )}
            <button type="button" className="button secondary" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            {activeTab === 'file' ? (
              <button type="submit" className="button primary" disabled={!file || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            ) : (
              <button type="button" className="button primary" onClick={handleCreateFolder} disabled={!newFolderName.trim() || uploading}>
                {uploading ? 'Creating...' : 'Create Folder'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
