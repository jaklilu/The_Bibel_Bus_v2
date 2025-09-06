import sqlite3 from 'sqlite3';
declare const db: sqlite3.Database;
export declare const runQuery: (sql: string, params?: any[]) => Promise<any>;
export declare const getRow: (sql: string, params?: any[]) => Promise<any>;
export declare const getRows: (sql: string, params?: any[]) => Promise<any[]>;
export declare const closeDatabase: () => void;
export default db;
//# sourceMappingURL=database.d.ts.map