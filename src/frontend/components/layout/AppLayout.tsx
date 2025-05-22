import { Component, JSX } from 'solid-js';
import { A } from '@solidjs/router';

type AppLayoutProps = {
  children: JSX.Element;
  // Add route props
  params?: Record<string, string>;
  location?: Location;
  data?: unknown;
};

export const AppLayout: Component<AppLayoutProps> = (props) => {
  const handleSignOut = () => {
    window.location.href = '/auth/signout';
  };

  console.log('AppLayout rendering with children:', props.children);

  return (
    <div class="min-h-screen bg-base-100">
      <div class="navbar bg-base-200 shadow-lg">
        <div class="flex-1">
          <A href="/" class="btn btn-ghost text-xl">Schedule Manager</A>
        </div>
        <div class="flex-none">
          <button 
            onClick={handleSignOut}
            class="btn btn-ghost"
          >
            Sign Out
          </button>
        </div>
      </div>
      <main class="container mx-auto p-4">
        {props.children || <div>No content to display</div>}
      </main>
    </div>
  );
};

export default AppLayout;
