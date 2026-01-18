import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import FileTree from '../components/FileTree';
import FilePreview from '../components/FilePreview';
import UploadModal from '../components/UploadModal';
import Header from '../components/Header';
import AIActivityIndicator from '../components/AIActivityIndicator';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <Sidebar onUploadClick={() => setShowUploadModal(true)} />
        <div className="main-content">
          <FileTree 
            key={refreshKey}
            onFileSelect={setSelectedFile}
            onFolderSelect={setSelectedFolder}
            selectedFolder={selectedFolder}
          />
          <FilePreview file={selectedFile} />
        </div>
      </div>
      {showUploadModal && (
        <UploadModal 
          folder={selectedFolder}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
      <AIActivityIndicator />
    </div>
  );
};

export default Dashboard;
