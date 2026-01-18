import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Sun, Moon, Search, Upload } from 'lucide-react';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-logo">
          <img src="./Sorta-logo.png" alt="Sorta" className="header-logo-img" />
        </h1>
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search files..." />
        </div>
      </div>
      
      <div className="header-right">
        <button className="header-button upload-button">
          <Upload size={18} />
          <span>Upload</span>
        </button>
        
        <button className="header-button icon-button" onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        
        <div className="user-info">
          <span>{user?.name}</span>
        </div>
        
        <button className="header-button icon-button" onClick={logout}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
