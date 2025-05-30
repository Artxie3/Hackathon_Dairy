import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AdvisorWidget from '../widgets/AdvisorWidget';
import { useTheme } from '../../contexts/ThemeContext';
import './Layout.css';

const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { darkMode } = useTheme();
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={`layout ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="layout-content">
        <Header toggleSidebar={toggleSidebar} />
        <main className="main-content">
          <Outlet />
        </main>
        <AdvisorWidget />
      </div>
    </div>
  );
};

export default Layout;