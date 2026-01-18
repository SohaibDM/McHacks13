import React from 'react';
import { X, Download, Share2, Trash2, Sparkles } from 'lucide-react';
import './FilePreview.css';

interface FilePreviewProps {
  file: any;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  if (!file) {
    return (
      <div className="file-preview empty">
        <div className="empty-state">
          <Sparkles size={48} strokeWidth={1.5} />
          <h3>Select a file to preview</h3>
          <p>Click on any file from the tree to see its details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-preview">
      <div className="preview-header">
        <h3>{file.name}</h3>
        <button className="close-button">
          <X size={20} />
        </button>
      </div>

      <div className="preview-content">
        <div className="file-thumbnail">
          <div className="thumbnail-placeholder">
            {file.name.split('.').pop()?.toUpperCase()}
          </div>
        </div>

        <div className="file-details">
          <div className="detail-row">
            <span className="detail-label">Type</span>
            <span className="detail-value">{file.name.split('.').pop()?.toUpperCase()} File</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Size</span>
            <span className="detail-value">2.4 MB</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Modified</span>
            <span className="detail-value">2 hours ago</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created</span>
            <span className="detail-value">Jan 15, 2026</span>
          </div>
        </div>

        {file.aiSorted && (
          <div className="ai-section">
            <div className="ai-section-header">
              <Sparkles size={18} />
              <h4>AI Organization</h4>
            </div>
            <p className="ai-reason">{file.aiReason || 'This file was automatically organized by AI'}</p>
            <div className="ai-suggestion">
              <span className="suggestion-label">Suggested location:</span>
              <span className="suggestion-path">Work Documents / Q1 Reports</span>
            </div>
          </div>
        )}

        <div className="preview-actions">
          <button className="action-button primary">
            <Download size={18} />
            Download
          </button>
          <button className="action-button">
            <Share2 size={18} />
            Share
          </button>
          <button className="action-button danger">
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
