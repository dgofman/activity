import { Application } from "express";

import * as express from "express";
import * as bodyParser from "body-parser";
import * as controllers from "./controllers/Controllers";

import Database from "./lib/Database";
import Global, { Logger, AppError, IParser } from "./lib/Global";
import ExampleParser from "./lib/ExampleParser";

const args: any = {};
process.argv.map((x): string[] => {
    return x.split("=");
}).map((y): void => {
    args[y[0]] = y[1];
});
const port: string = process.env.PORT || args.PORT || process.env.npm_package_config_port || Global.PORT;

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //
// Initialize the Express application.

const db = Database.getInstance((err: Error | null): void => {
    if (err) {
        return;
    }

    const parser: IParser = new ExampleParser(db);
    parser.initialize((err?: Error | null) => {
        if (err) {
            new AppError("Cannot initialize parser", err);
        } else {
            parser.getNodes((err?: Error | null, data?: any): void => {
                if (err) {
                    new AppError("Cannot initialize parser", err);
                } else {
                    const app: Application = express();
                    app.use(bodyParser.urlencoded({ extended: false }));
                    app.use(bodyParser.json());

                    app.use("/", express.static("dist/client")); //Static Resources (JS/CSS/icons)

                    controllers.init(app, data);
                    controllers.errors(app);

                    app.listen(port, (): void => {
                        Logger.log(`Application listening on port: ${port}`);
                    });
                }
            });
        }
    });
});