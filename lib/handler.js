/**
 * Wraps a route handler so storage problems surface as an actionable 503
 * rather than an opaque 500. On Vercel the most common cause is a Blob store
 * that was never connected, which makes every write hit a read-only disk.
 */
import { StorageError } from './store';

export function withStorageErrors(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof StorageError) {
        return Response.json({ success: false, error: error.message }, { status: 503 });
      }
      console.error('Unhandled route error:', error);
      return Response.json(
        { success: false, error: 'Server error. Check the deployment logs for details.' },
        { status: 500 }
      );
    }
  };
}
