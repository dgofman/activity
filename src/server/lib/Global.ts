import { Request, Response } from "express";
import * as Debug from "debug";
import * as path from "path";
import * as fs from "fs";

import chalk from "chalk";

import { Callback } from "./Database";

export default class Global {
    public static readonly APP_DIR = process.cwd();
    public static readonly CLIENT_DIR = path.resolve(Global.APP_DIR, "src/client");
    public static readonly SERVER_DIR = path.resolve(Global.APP_DIR, "src/server");
    public static readonly DATA_DIR = path.resolve(Global.APP_DIR, "data");
    public static readonly PORT = 3000;
    private static readonly templates: {
        [name in string]: string
    } = {} as any;

    public static debug(fileName: string): Debug.IDebugger {
        const fn = path.relative(Global.SERVER_DIR, fileName),
            debug = Debug(`activity:${path.basename(fn, ".ts")}`);
        debug(`Init ${fn}`);
        return debug;
    }

    public static loadTemplates(): void {
        const dir = `${Global.CLIENT_DIR}/templates`;
        fs.readdir(dir, (err: NodeJS.ErrnoException, files: string[]): void => {
            if (err) {
                new AppError("cannot read template directory: " + dir, err);
            } else {
                files.forEach(file => {
                    fs.readFile(path.resolve(dir, file), (err: NodeJS.ErrnoException, buf: Buffer): void => {
                        if (err) {
                            new AppError("cannot load template: " + file, err);
                        } else {
                            Global.templates[file] = buf.toString();
                        }
                    });
                });
            }
        })
    }

    public static render(_req: Request, res: Response, name: string, locales: any, params: any = {}, headers = { "Content-Type": "text/html" }): void {
        let html = Global.templates[name + ".t"];
        if (!html) {
            Logger.error(`Template '${name}' not found. Available templates: ` + Object.keys(Global.templates));
        }
        if (params) {
            const names = ["Locales"],
                values = [locales];
            for (let name in params) {
                names.push(name);
                values.push(params[name]);
            }
            try {
                html = new Function(...names, "return `" + html + "`;")(...values);
            } catch (err) {
                new AppError("cannot render template: " + name, err);
            }
        }
        res.header(headers).send(html);
    }
}

export interface IParser {
    initialize(callback: Callback): void;
    getNodes(callback: Callback): void;
}

export class Logger {
    static log(value: any): void {
        console.log(value);
    }

    static warn(value: any): void {
        console.warn(chalk.yellow(value));
    }

    static error(value: any): void {
        console.error(chalk.red(value));
    }
}

export class AppError extends Error {
    constructor(message: string, readonly rootCause?: Error) {
        super(message);
        this.name = "AppError";
        this.rootCause = rootCause;
        // Capture the current stack trace and store it in the property "this.stack".
        Error.captureStackTrace(this, this.constructor);
        Logger.error(this.stack);
        if (rootCause) {
            Logger.warn("[\n" + rootCause.stack + "\n]");
        }
    }
}