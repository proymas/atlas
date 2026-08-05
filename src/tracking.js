import { post } from './api.js';
import { APP_VERSION } from './config.js';

export function track(name, data = {}) {
  post('/api/event', { name, data, version: APP_VERSION }).catch(() => {});
}
