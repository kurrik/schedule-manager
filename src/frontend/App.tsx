import { Component, Show, createEffect } from 'solid-js';
import { createResource } from "solid-js";

const fetchUser = async () => {
  const response = await fetch('/api/me');
  if (response.status === 401) {
    window.location.href = '/auth/signin';
    return null;
  }
  return response.json();
};

const App: Component = () => {
  const [user] = createResource(fetchUser);

  const handleSignOut = () => {
    window.location.href = '/auth/signout';
  };

  return (
    <div class="min-h-screen bg-gray-100">
      <Show when={!user.loading}>
        <div class="max-w-4xl mx-auto px-4 py-8">
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-2xl font-bold text-gray-800">Welcome to Schedule Manager</h1>
              <button
                onClick={handleSignOut}
                class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
            <p class="text-lg text-gray-700">Hello, {user()?.name || 'User'}</p>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default App;