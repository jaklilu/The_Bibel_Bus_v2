"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database/database");
const userAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: { message: 'Access denied. No token provided.' }
            });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            // Get user from database to ensure they still exist and are active
            const user = await (0, database_1.getRow)('SELECT id, name, email, role, status FROM users WHERE id = ?', [decoded.userId]);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'User not found' }
                });
            }
            if (user.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Account is not active' }
                });
            }
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            };
            next();
        }
        catch (jwtError) {
            return res.status(401).json({
                success: false,
                error: { message: 'Invalid token' }
            });
        }
    }
    catch (error) {
        console.error('User auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        });
    }
};
exports.userAuth = userAuth;
//# sourceMappingURL=userAuth.js.map