import { 
  ConfigManager,
  DatabaseConnection,
  CMSManager,
  UserManager,
  ContentManager,
  Logger
} from '@modular-app/core/server'; // Use server entry point

// Server-only utilities
export const serverUtils = {
  configManager: ConfigManager,
  databaseConnection: DatabaseConnection,
  cmsManager: CMSManager,
  userManager: UserManager, 
  contentManager: ContentManager,
  logger: Logger,
};

// Dynamic import wrapper for server-side modules
export async function getServerModule<T>(
  moduleName: string,
  importFn: () => Promise<T>
): Promise<T> {
  if (typeof window !== 'undefined') {
    throw new Error(`${moduleName} can only be used on the server side`);
  }
  return await importFn();
}