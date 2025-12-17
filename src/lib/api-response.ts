import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

type ErrorResponse = {
  error: string;
  details?: any;
};

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown, status = 500) {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation Error', details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: status === 500 && error.message === 'Unauthorized' ? 401 : status }
    );
  }

  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status }
  );
}
