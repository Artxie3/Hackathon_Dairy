import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Github, Youtube, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name) {
          throw new Error('Name is required');
        }
        await register(name, email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <Code size={32} />
          <h1>Hackathon Diary</h1>
        </div>
        
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`} 
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`} 
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input"
                required
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="input"
              required
            />
          </div>
          
          {error && <div className="auth-error">{error}</div>}
          
          <button 
            type="submit" 
            className={`btn btn-primary auth-submit ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-divider">
          <span>or continue with</span>
        </div>
        
        <div className="social-logins">
          <button className="social-btn github">
            <Github size={18} />
            <span>GitHub</span>
          </button>
          
          <button className="social-btn youtube">
            <Youtube size={18} />
            <span>YouTube</span>
          </button>
          
          <button className="social-btn spotify">
            <Music size={18} />
            <span>Spotify</span>
          </button>
        </div>
      </div>
      
      <div className="auth-feature-list">
        <div className="feature-card">
          <h3>Link All Your Accounts</h3>
          <p>Connect GitHub, Devpost, YouTube, Spotify and more for a complete coding journey.</p>
        </div>
        
        <div className="feature-card">
          <h3>Track Your Progress</h3>
          <p>Monitor your coding hours, GitHub commits and projects in one place.</p>
        </div>
        
        <div className="feature-card">
          <h3>Personal Advisor</h3>
          <p>Get reminders for breaks and deadlines based on your work patterns.</p>
        </div>
        
        <div className="feature-card">
          <h3>Private Journal</h3>
          <p>Add emotional context to your technical work with private notes.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;