/**
 * Database Stub - Temporary during Firebase migration
 * 
 * This prevents build errors while we migrate from Prisma to Firestore.
 * Routes using this will return "Not implemented" until migrated.
 */

const prismaStub = new Proxy({}, {
  get(target, prop) {
    return new Proxy({}, {
      get(target, method) {
        return () => {
          throw new Error(`Prisma method ${String(prop)}.${String(method)}() not available - route needs Firebase migration`);
        };
      }
    });
  }
});

export const prisma = prismaStub;
export default prisma;
