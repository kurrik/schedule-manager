import { Component, createSignal, onMount, Show } from 'solid-js';
import LoadingSpinner from './components/common/LoadingSpinner';
import { useApi } from './services/api';
import AppLayout from './components/layout/AppLayout';

const App: Component<{ children?: any }> = (props) => {
  const api = useApi();
  const [isAuthenticated, setIsAuthenticated] = createSignal<boolean | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  // Debug: log on each render
  console.log('App component rendered', { isLoading: isLoading(), isAuthenticated: isAuthenticated() });

  onMount(async () => {
    try {
      await api.getCurrentUser();
      console.log('User authenticated');
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      window.location.href = '/auth/signin';
    } finally {
      setIsLoading(false);
      console.log('setIsLoading(false) called');
    }
  });

  // Use <Show> for conditional rendering (SolidJS best practice)
  return (
    <Show when={!isLoading()} fallback={<LoadingSpinner fullScreen={true} />}>
      <Show when={isAuthenticated()}>
        <AppLayout>
          {props.children}
        </AppLayout>
      </Show>
    </Show>
  );
};

export default App;