import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_wasla_jwt_key_123!@#';

/**
 * Middleware: Authenticate Admin JWT Token
 */
export const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No admin token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Ensure this is actually an admin token (the payload should have a role)
        if (!decoded.role) {
            return res.status(403).json({ success: false, message: 'Access denied. Generic user token provided instead of admin token.' });
        }
        req.admin = decoded; // Attach admin info to request
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token is not valid or expired' });
    }
};

/**
 * Middleware: Require Exact 'owner' Role
 */
export const requireOwner = (req, res, next) => {
    if (req.admin.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Access denied: Super Admin (Owner) privileges required.' });
    }
    next();
};

/**
 * Middleware Factory: Require Specific Boolean Permission
 * Usage: requirePermission('canEditUsers')
 */
export const requirePermission = (permission) => {
    return (req, res, next) => {
        // Owners bypass permission checks
        if (req.admin.role === 'owner') {
            return next();
        }

        if (req.admin[permission] !== true) {
            return res.status(403).json({ success: false, message: `Access denied: Requires '${permission}' permission.` });
        }

        next();
    };
};
