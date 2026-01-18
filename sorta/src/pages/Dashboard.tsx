import React, { useState } from 'react';
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

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <Sidebar />
        <div className="main-content">
          <FileTree 
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
        />
      )}
      <AIActivityIndicator />
    </div>
  );
};

export default Dashboard;
