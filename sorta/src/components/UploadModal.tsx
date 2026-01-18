import React, { useState } from 'react';
import { X, Upload, Sparkles, Folder } from 'lucide-react';
import './UploadModal.css';

interface UploadModalProps {
  folder: any;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ folder, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [aiSort, setAiSort] = useState(true);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Upload:', { file, description, aiSort });
    setUploading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload File</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
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

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
