"use server";

import { createReception, type CreateReceptionInput } from "@/server/reception.service";

export async function createReceptionAction(input: CreateReceptionInput) {
  return createReception(input);
}
