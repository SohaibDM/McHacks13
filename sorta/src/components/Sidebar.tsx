import React from 'react';
import { Home, Star, Clock, Trash2, HardDrive, Upload } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  onUploadClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onUploadClick }) => {
  return (
    <aside className="sidebar">
      <button className="upload-button" onClick={onUploadClick}>
        <Upload size={20} />
        <span>Upload</span>
      </button>

      <nav className="sidebar-nav">
        <button className="sidebar-item active">
          <Home size={20} />
          <span>My Files</span>
        </button>
        <button className="sidebar-item">
          <Star size={20} />
          <span>Starred</span>
        </button>
        <button className="sidebar-item">
          <Clock size={20} />
          <span>Recent</span>
        </button>
        <button className="sidebar-item">
          <Trash2 size={20} />
          <span>Trash</span>
        </button>
      </nav>
      
      <div className="storage-info">
        <div className="storage-header">
          <HardDrive size={18} />
          <span>Storage</span>
        </div>
        <div className="storage-bar">
          <div className="storage-used" style={{ width: '35%' }}></div>
        </div>
        <p className="storage-text">3.5 GB of 10 GB used</p>
      </div>
    </aside>
  );
};

export default Sidebar;
