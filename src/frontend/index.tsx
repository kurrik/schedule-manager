/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import App from './App';
import ScheduleList from './components/schedule/ScheduleList';
import ScheduleDetail from './components/schedule/ScheduleDetail';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error('Root element not found');
}

// Render the app with proper routing
render(() => (
  <Router root={App}>
    <Route path="/" component={ScheduleList} />
    <Route path="/schedule/:id" component={ScheduleDetail} />
  </Router>
), root!);