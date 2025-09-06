"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database/database");
const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Access denied. No token provided.'
                }
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // Get user from database to check role
        const user = await (0, database_1.getRow)('SELECT id, email, role FROM users WHERE id = ?', [decoded.userId]);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid token. User not found.'
                }
            });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Access denied. Admin privileges required.'
                }
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: {
                message: 'Invalid token.'
            }
        });
    }
};
exports.adminAuth = adminAuth;
//# sourceMappingURL=adminAuth.js.map