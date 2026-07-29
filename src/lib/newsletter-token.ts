import crypto from "crypto";

/** Token de baja firmado con HMAC-SHA256, para enlaces de "desuscribirse" en correos. */
export function unsubscribeToken(email: string): string {
  return crypto
    .createHmac("sha256", process.env.NEXTAUTH_SECRET || "")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(email));
  const received = Buffer.from(token);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
