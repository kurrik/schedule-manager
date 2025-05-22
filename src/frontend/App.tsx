import type { Component } from 'solid-js';
import { createResource } from "solid-js";

const fetchUser = async () =>
  (await fetch(`/api/me`)).json();

const App: Component = () => {
  const [user] = createResource(fetchUser);
  return (
    <p class="text-4xl text-green-700 text-center py-20">Hello {user()?.name}</p>
  );
};

export default App;