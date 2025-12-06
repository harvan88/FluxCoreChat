import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import { AuthPage } from './components/auth/AuthPage';

function App() {
  const { isAuthenticated, initFromStorage } = useAuthStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <Layout />;
}

export default App;
