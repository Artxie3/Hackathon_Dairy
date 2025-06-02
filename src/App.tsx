import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { DiaryProvider } from './contexts/DiaryContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { HackathonProvider } from './contexts/HackathonContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import DiaryEntries from './pages/DiaryEntries';
import Projects from './pages/Projects';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Hackathons from './pages/Hackathons';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <DiaryProvider>
            <DashboardProvider>
              <HackathonProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="diary" element={<DiaryEntries />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="settings" element={<Settings />} />
                        <Route path="hackathons" element={<Hackathons />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
              </HackathonProvider>
            </DashboardProvider>
          </DiaryProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;