/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import App from './App';
import ScheduleList from './components/schedule/ScheduleList';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error('Root element not found');
}

// Define routes
const Routes = () => (
  <Router>
    <Route path="/" component={App} />
    <Route path="/schedules" component={() => <ScheduleList />} />
  </Router>
);

// Render the app
render(() => <Routes />, root!);