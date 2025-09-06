import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: string;
    };
}
export declare const adminAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=adminAuth.d.ts.map