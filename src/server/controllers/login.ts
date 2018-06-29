import * as fs from "fs";
import * as path from "path";
import { Router, NextFunction, Request, Response } from "express";
import Global, { Logger } from "../lib/Global";
import Database, { UserData } from "../lib/Database";

import LoginLocales from "../../client/locales/login";

type Session = { data: UserData, time: number };

export class LoginSession {
    static readonly TIMEOUT: number = 30 * 60 * 1000;
    static readonly sessions: { [uuid: string]: Session } = {};

    static readonly SESSION_FILE = path.join(Global.DATA_DIR, ".session");

    static addSession(data: UserData): string {
        const sessionId: string = LoginSession.getUuid();
        LoginSession.sessions[sessionId] = { data, time: Date.now() };
        LoginSession.save();
        return sessionId;
    }

    static getSession(req: Request): Session | null {
        const cookie = (req.headers.cookie || "") as string,
            match = cookie.match(new RegExp("sessionId=.[^;]*"));
        return LoginSession.sessions[match ? match[0].split("=")[1] : ""];
    }

    static isActive(req: Request, res: Response): UserData | null {
        const session: Session | null = LoginSession.getSession(req);
        if (!session) {
            res.redirect("/login");
            return null;
        }
        session.time = Date.now();
        return session.data;
    }

    static getUuid(): string {
        return "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".replace(/[x]/g, (c: string): string => {
            var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static save(): void {
        fs.writeFile(LoginSession.SESSION_FILE, JSON.stringify(LoginSession.sessions), (err: Error): void => {
            if (err) {
                Logger.error(err);
            }
        });
    }
}

export default (route: Router): void => {
    const debug = Global.debug(__filename),
        db = Database.getInstance();

    if (fs.existsSync(LoginSession.SESSION_FILE)) {
        fs.readFile(LoginSession.SESSION_FILE, (err: NodeJS.ErrnoException, buf: Buffer): void => {
            if (err) {
                Logger.error(err);
            } else {
                const json = JSON.parse(buf.toString());
                for (const key in json) {
                    LoginSession.sessions[key] = json[key];
                }
            }
        });
    }

    setInterval((): void => {
        const now = Date.now();
        for (const sessionId in LoginSession.sessions) {
            if (LoginSession.sessions[sessionId].time + LoginSession.TIMEOUT < now) {
                debug("Session timeout: " + sessionId);
                delete LoginSession.sessions[sessionId];
                LoginSession.save();
            }
        }
    }, 60 * 1000);

    route.get("/", (req: Request, res: Response, next: NextFunction): void => {
        Global.render(req, res, "login", LoginLocales, { error: "", username: "" });
        next();
    });

    route.post("/", (req: Request, res: Response, next: NextFunction): void => {
        debug(`username: ${req.body.username}`);
        db.findUser(res, req.body, (err?: Error | null, rows?: any): void => {
            if (err) {
                Global.render(req, res, "login", LoginLocales, { error: LoginLocales.internalError, username: "" });
            } else if (rows.length === 0) {
                Global.render(req, res, "login", LoginLocales, { error: LoginLocales.invalid_user, username: req.body.username });
            } else {
                res.cookie("sessionId", LoginSession.addSession(rows[0]));
                res.redirect("/main");
            }
            next();
        });
    });

    route.get("/new", (req: Request, res: Response, next: NextFunction): void => {
        Global.render(req, res, "register", LoginLocales, { error: "", body: { username: "", firstname: "", lastname: "", email: "" } });
        next();
    });

    route.post("/new", (req: Request, res: Response, next: NextFunction): void => {
        db.createUser(res, req.body, (err?: Error | null): void => {
            if (err) {
                const error = err.message.indexOf("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.username") !== -1 ? LoginLocales.username_exists : LoginLocales.internalError;
                Global.render(req, res, "register", LoginLocales, { error, body: req.body });
            } else {
                res.redirect("/login");
            }
            next();
        });
    });
}