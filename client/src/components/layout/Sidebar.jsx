import { useApp, MODULES } from '../../context/AppContext';
import './Sidebar.css';

const MODULE_CONFIG = {
  wells: { label: 'Wells', icon: '\u{1F6E2}' },
  production: { label: 'Production', icon: '\u{1F4CA}' },
  petrophysics: { label: 'Petrophysics', icon: '\u{1F9EA}' },
  events: { label: 'Events', icon: '\u{1F4C5}' },
  allocation: { label: 'Allocation', icon: '\u{2699}' },
  users: { label: 'Users', icon: '\u{1F465}' },
};

export default function Sidebar() {
  const { state, dispatch } = useApp();

  const visibleModules = state.user?.is_admin
    ? MODULES
    : MODULES.filter(mod => mod !== 'users');

  return (
    <aside className="sidebar">
      <nav className="sidebar-modules">
        {visibleModules.map(mod => (
          <button
            key={mod}
            className={`module-btn ${state.currentModule === mod ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_MODULE', payload: mod })}
          >
            <span className="module-icon">{MODULE_CONFIG[mod].icon}</span>
            <span className="module-label">{MODULE_CONFIG[mod].label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
