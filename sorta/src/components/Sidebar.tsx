import React from 'react';
import { Home, Star, Clock, Trash2, HardDrive } from 'lucide-react';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
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
