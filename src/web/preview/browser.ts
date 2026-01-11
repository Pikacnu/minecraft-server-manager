import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { wsHandlers } from './websocket';

export const worker = setupWorker(...handlers, ...wsHandlers);
