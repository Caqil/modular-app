export {
  MiddlewareManager,
} from '@modular-app/core';

// Import middleware types
export type {
  MiddlewareFunction,
  APIMiddleware,
  RateLimitConfig,
} from '@modular-app/core';

// Admin-specific middleware
export const AdminMiddleware = {
  /**
   * Middleware to ensure user is authenticated
   */
  requireAuth: (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  },

  /**
   * Middleware to ensure user has admin access
   */
  requireAdmin: (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const adminRoles = ['admin', 'super_admin', 'editor'];
    if (!adminRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },

  /**
   * Middleware to require specific permission
   */
  requirePermission: (permission: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.user?.permissions?.includes(permission)) {
        return res.status(403).json({ 
          error: `Permission '${permission}' required` 
        });
      }
      next();
    };
  },

  /**
   * Middleware to require specific role
   */
  requireRole: (roles: string | string[]) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req: any, res: any, next: any) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: `Role required: ${allowedRoles.join(' or ')}` 
        });
      }
      next();
    };
  },

  /**
   * Middleware for request logging in admin panel
   */
  logRequest: (req: any, res: any, next: any) => {
    console.log(`[Admin] ${req.method} ${req.path}`, {
      user: req.user?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });
    next();
  },

  /**
   * Middleware to validate request body
   */
  validateBody: (schema: any) => {
    return (req: any, res: any, next: any) => {
      // Use core validator here
      try {
        // Validation logic would go here
        next();
      } catch (error) {
        res.status(400).json({ error: 'Invalid request body' });
      }
    };
  },
};
