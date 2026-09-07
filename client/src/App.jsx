import { useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import LoginPage from './pages/LoginPage';
import WellsPage from './pages/WellsPage';
import ProductionPage from './pages/ProductionPage';
import PetrophysicsPage from './pages/PetrophysicsPage';
import EventsPage from './pages/EventsPage';
import AllocationPage from './pages/AllocationPage';
import UsersPage from './pages/UsersPage';
import { useApp } from './context/AppContext';
import './App.css';

function ModuleRouter() {
  const { state } = useApp();

  switch (state.currentModule) {
    case 'wells':
      return <WellsPage />;
    case 'production':
      return <ProductionPage />;
    case 'petrophysics':
      return <PetrophysicsPage />;
    case 'events':
      return <EventsPage />;
    case 'allocation':
      return <AllocationPage />;
    case 'users':
      return <UsersPage />;
    default:
      return <WellsPage />;
  }
}

function App() {
  const { state } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Show loading while checking auth
  if (!state.authChecked) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!state.user) {
    return <LoginPage />;
  }

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="app-layout">
      <Header onToggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} />
      <main className="app-main" style={{ marginLeft: sidebarOpen ? '200px' : '0', marginTop: '56px' }}>
        <ModuleRouter />
      </main>
    </div>
  );
}

export default App;
