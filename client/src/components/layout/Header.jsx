import { useApp } from '../../context/AppContext';
import './Header.css';

export default function Header() {
  const { state, logout } = useApp();

  return (
    <header className="header">
      <div className="header-title">
        <h1>Subsurface Allocation</h1>
        <span className="header-subtitle">Production Distribution Engine</span>
      </div>
      <div className="header-right">
        <span className="header-user">{state.user?.username}</span>
        <button className="header-logout" onClick={logout} title="Sign out">
          Logout
        </button>
      </div>
    </header>
  );
}
