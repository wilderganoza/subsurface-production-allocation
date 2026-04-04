import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

export default function Header({ onToggleSidebar }) {
  const { state, logout } = useApp();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      {/* Left: hamburger + logo + title */}
      <div className="header-left">
        <button className="header-hamburger" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg className="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="header-branding">
          <svg className="header-logo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 13h2v8H3zm6-4h2v12H9zm6-6h2v18h-2zm6 10h2v8h-2z" />
          </svg>
          
          <div className="header-title">
            <h1>Subsurface Production Allocation</h1>
          </div>
        </div>
      </div>

      {/* Right: theme toggle + user info + logout */}
      <div className="header-right">
        <button className="header-theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        
        {state.user && (
          <>
            <div className="header-user-info">
              <p className="header-user-name">{state.user.username}</p>
              <p className="header-user-role">{state.user.is_admin ? 'Admin' : 'User'}</p>
            </div>
            
            <div className="header-avatar">
              {state.user.username.charAt(0).toUpperCase()}
            </div>
            
            <button className="header-logout" onClick={logout} title="Logout">
              <svg className="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
