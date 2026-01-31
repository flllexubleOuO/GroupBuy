import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Express 4 does NOT automatically forward rejected promises from async handlers.
 * This helper ensures async route errors reach the global error middleware.
 */
export function asyncHandler(fn: (...args: any[]) => any): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

