import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

type ErrorResponse = {
  error: string;
  details?: any;
};

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

function isErrorWithMessage(error: unknown): error is { message: string; code?: string; details?: unknown; hint?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

export function errorResponse(error: unknown, status = 500) {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    const details = (error as any).issues ?? (error as any).errors;
    return NextResponse.json(
      { error: 'Validation Error', details },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: status === 500 && error.message === 'Unauthorized' ? 401 : status }
    );
  }

  // Supabase/PostgREST errors are often plain objects (not instanceof Error).
  if (isErrorWithMessage(error)) {
    const payload: ErrorResponse = {
      error: error.message,
    };

    const extra: Record<string, unknown> = {};
    if (typeof (error as any).code === 'string') extra.code = (error as any).code;
    if ((error as any).details != null) extra.details = (error as any).details;
    if ((error as any).hint != null) extra.hint = (error as any).hint;
    if (Object.keys(extra).length) payload.details = extra;

    return NextResponse.json(payload, { status });
  }

  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status }
  );
}
