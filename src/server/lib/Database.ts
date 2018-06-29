import { Response } from "express";
import Global, { AppError, Logger } from "./Global";
import * as fs from "fs";
import * as sqlite3 from "sqlite3";

export type Callback = (err?: DBError | Error | null, rows?: any) => void;

export type UserData = {
    username: string,
    firstname: string,
    lastname: string
};

export type TreeItem = {
    id: string,
    name: string;
    nodes?: Array<TreeItem>;
}

export default class Database {

    static instance: Database | null = null;

    readonly _db: sqlite3.Database;

    readonly TABLE_NODES = {
        name: "nodes",
        create: "id INTEGER PRIMARY KEY, name TEXT NOT NULL, parentId INTEGER, properties TEXT",
        insert: "INSERT INTO nodes (id, name, parentId, properties) VALUES",
        select: "SELECT id, name, parentId FROM nodes",
        properties: "SELECT properties FROM nodes WHERE id=(?)"
    }
    readonly TABLE_USERS = {
        name: "users",
        create: "username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, firstname TEXT NOT NULL, lastname TEXT NOT NULL, email TEXT NOT NULL",
        insert: "INSERT INTO users (username, password, firstname, lastname, email) VALUES(?, ?, ?, ?, ?)",
        select: "SELECT username, firstname, lastname FROM users WHERE username=(?) AND password=(?)"
    };
    public readonly TABLE_DIAGRAM = {
        name: "diagram",
        create: "id INTEGER PRIMARY KEY, username TEXT NOT NULL, name TEXT NOT NULL, path TEXT NOT NULL, isDefault INTEGER, data TEXT NOT NULL",
        insert: "INSERT INTO diagram (username, name, path, data, isDefault) VALUES(?, ?, ?, ?, ?)",
        select: "SELECT id, data FROM diagram WHERE username=(?) and (id=(?) OR isDefault=1)",
        update: "UPDATE diagram SET name=(?), path=(?), data=(?), isDefault=(?) WHERE id=(?) AND username=(?)",
        names: "SELECT id, name, path, isDefault FROM diagram WHERE username=(?)",
        reset: "UPDATE diagram SET isDefault=0 WHERE username=(?)"
    };

    private constructor(callback?: (err: Error | null) => void) {
        Error.captureStackTrace(this, DBError);
        if (!fs.existsSync(Global.DATA_DIR)) {
            fs.mkdirSync(Global.DATA_DIR);
        }
        this._db = new sqlite3.Database(Global.DATA_DIR + "/activity.sqlite", (err: Error | null) => {
            if (err) {
                new AppError("Cannot connect to database", err);
            } else {
                Logger.log("Connected to the SQLite database");
            }
            if (callback) {
                callback(err);
            }
        });
    }

    public static getInstance(callback?: (err: Error | null) => void): Database {
        if (Database.instance == null) {
            Database.instance = new Database(callback);
        }
        return Database.instance;
    }

    createTable(name: string, columns: string, callback?: Callback): void {
        this._db.run(`CREATE TABLE IF NOT EXISTS ${name}(${columns})`, [], (err: Error): void => {
            if (err) {
                new AppError(`Cannot create a table: ${name}`, err);
            }
            if (callback) {
                callback(err, null);
            }
        });
    }

    getTable(name: string, callback: Callback): void {
        this.select(null, callback, `SELECT name FROM sqlite_master WHERE type='table' AND name=(?)`, [name]);
    }

    createUser(res: Response, body: any, callback: Callback): void {
        this.run(res, callback, this.TABLE_USERS.insert, [body.username, body.password, body.firstname, body.lastname, body.email]);
    }

    findUser(res: Response, body: any, callback: Callback): void {
        this.select(res, callback, this.TABLE_USERS.select, [body.username, body.password]);
    }

    run(res: Response | null, callback: Callback, sql: string, params: any): void {
        const stmt: sqlite3.Statement = this._db.prepare(sql, params);
        stmt.run(this.logHandler(res, sql, (err?: Error | null): void => {
            callback(err, (<any>stmt).lastID);
        }));
        stmt.finalize();
    }

    select(res: Response | null, callback: Callback, sql: string, params: Array<any>): void {
        this._db.all(sql, params, this.logHandler(res, sql, callback));
    }

    logHandler(res: Response | null, sql: string, callback: Callback): (err?: Error | null, rows?: any[]) => void {
        const dbError = new DBError(sql);
        return (err?: Error | null, rows?: any[]): void => {
            if (err) {
                const code: string = "AG-" + Date.now();
                Logger.error(code + " - " + err);
                Logger.warn(dbError.stack);
                if (res) {
                    res.setHeader("ERROR-CODE", code);
                }
                if (!err.message || !err.message.length) {
                    err.message = err.toString();
                }
                return callback({
                    code,
                    name: err.name || "DBError",
                    message: err.message || err.toString()
                }, null);
            }
            callback(err, rows);
        };
    }

    getNodes(callback: Callback): void {
        this.select(null, (err?: Error | null, rows?: any): void => {
            if (err) {
                return callback(err);
            }
            const map: any = {},
                tree: Array<TreeItem> = [];
            rows.forEach((row: any) => {
                if (!map[row.id]) {
                    map[row.id] = [];
                }
                if (row.parentId === null) {
                    tree.push({
                        id: row.id,
                        name: row.name,
                        nodes: map[row.id]
                    });
                } else {
                    if (!map[row.parentId]) {
                        map[row.parentId] = [];
                    }
                    map[row.parentId].push({
                        id: row.id,
                        name: row.name,
                        nodes: map[row.id]
                    });
                }
            });
            callback(null, tree);
        }, this.TABLE_NODES.select, []);
    }
}
class DBError extends Error {

    public code: string | undefined;

    constructor(sql: string) {
        super("SQL: " + sql);
    }
}