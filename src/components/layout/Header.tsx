import React, { useState } from 'react';
import { Menu, Bell, Moon, Sun, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import './Header.css';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { notifications } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // Implement search functionality
  };
  
  const toggleNotificationsPanel = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-container">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </form>
      </div>
      
      <div className="header-right">
        <button className="header-icon-btn" onClick={toggleDarkMode}>
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div className="notifications-container">
          <button className="header-icon-btn" onClick={toggleNotificationsPanel}>
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="notifications-badge">{notifications.length}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="notifications-panel">
              <h3>Notifications</h3>
              {notifications.length > 0 ? (
                <ul className="notifications-list">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="notification-item">
                      <div className="notification-content">
                        <p className="notification-message">{notification.message}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-notifications">No new notifications</p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;