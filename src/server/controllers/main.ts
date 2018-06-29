import { Router, NextFunction, Request, Response } from "express";
import Global from "../lib/Global";
import Database, { UserData, TreeItem, Callback } from "../lib/Database";
import { LoginSession } from "./login";

import MainLocales from "../../client/locales/main";

export default (route: Router, tree: Array<TreeItem>): void => {
    const db = Database.getInstance();

    route.get("/", (req: Request, res: Response, next: NextFunction): void => {
        const session: UserData | null = LoginSession.isActive(req, res);
        if (session) {
            db.select(res, (err?: Error | null, rows?: any): void => {
                const desing = rows && rows.length ? rows[0] : {};
                Global.render(req, res, "index", MainLocales, {
                    TREE: JSON.stringify(tree),
                    ID: desing.id,
                    DATA: desing.data || "[]",
                    ERROR: err,
                    FIRSTNAME: session.firstname
                });
                next();
            }, db.TABLE_DIAGRAM.select, [session.username, req.query.diagramId]);
        }
    });

    route.post("/", (req: Request, res: Response, next: NextFunction): void => {
        const session: UserData | null = LoginSession.isActive(req, res);
        if (session) {
            const insertOrUpdate: Callback = (err?: Error | null): void => {
                if (err) {
                    res.status(400).json(err);
                } else {
                    const body = req.body;
                    if (!body.id) {
                        db.run(res, (err?: Error | null, id?: any): void => {
                            if (err) {
                                res.status(400).json(err);
                            } else {
                                res.json(id);
                            }
                            next();
                        }, db.TABLE_DIAGRAM.insert, [session.username, body.name, body.path, JSON.stringify(body.data), body.isDefault]);
                    } else {
                        db.run(res, (err?: Error | null, id?: any): void => {
                            if (err) {
                                res.status(400).json(err);
                            } else {
                                res.json(id);
                            }
                            next();
                        }, db.TABLE_DIAGRAM.update, [body.name, body.path, JSON.stringify(body.data), body.isDefault, body.id, session.username]);
                    }
                }
            };
            if (!req.body.isDefault) {
                insertOrUpdate();
            } else {
                db.run(res, insertOrUpdate, db.TABLE_DIAGRAM.reset, [session.username]);
            }
        }
    });

    route.get("/diagrams", (req: Request, res: Response, next: NextFunction): void => {
        const session: UserData | null = LoginSession.isActive(req, res);
        if (session) {
            db.select(res, (err?: Error | null, rows?: any): void => {
                res.json(err ? [] : rows);
                next();
            }, db.TABLE_DIAGRAM.names, [session.username]);
        }
    });

    route.get("/properties", (req: Request, res: Response, next: NextFunction): void => {
        const session: UserData | null = LoginSession.isActive(req, res);
        if (session) {
            db.select(res, (_err?: Error | null, rows?: any): void => {
                const properties = rows && rows.length ? rows[0].properties : "{}";
                res.json(JSON.parse(properties));
                next();
            }, db.TABLE_NODES.properties, [req.query.id]);
        }
    });
}