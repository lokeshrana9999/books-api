import { AsyncLocalStorage } from 'async_hooks';

type RequestContext = {
  requestId: string;
  userId?: string;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();