// Prisma has been removed from the project.
// This stub remains only to satisfy any legacy imports (e.g. in tests).
// Do NOT use at runtime.

export const prisma: any = new Proxy({}, {
  get() {
    throw new Error('Prisma has been removed from this project. No runtime usage allowed.');
  }
});
