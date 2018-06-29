import * as express from "express";

import { Application, Router, NextFunction, Request, Response } from "express";
import Global, { AppError, Logger } from "../lib/Global";
import Database, { TreeItem } from "../lib/Database";

import Login from "./login";
import Main from "./main";

export function init(app: Application, tree: Array<TreeItem>): void {
  const debug = Global.debug(__filename);

  const db = Database.getInstance();
  db.createTable(db.TABLE_USERS.name, db.TABLE_USERS.create);
  db.createTable(db.TABLE_DIAGRAM.name, db.TABLE_DIAGRAM.create);

  Global.loadTemplates();

  app.use("/", express.static("src/client/resources"));

  const createRouter = (basePath: string): Router => {
    const router = express.Router();
    app.use(basePath, router);
    return router;
  };

  app.use((req: Request, _res: Response, next: NextFunction): void => {
    debug("%s::%s", req.method, req.url);
    next();
  });

  app.get("/", (_req, res, next: NextFunction): void => {
    res.redirect("/login");
    next();
  });
  Login(createRouter("/login"));
  Main(createRouter("/main"), tree);
}

export function errors(app: Application): void {
  // ERROR HANDLING
  app.use(
    (error: any, _req: Request, res: Response, next: NextFunction): void => {
      // CAUTION: Just wrapping an error so that the error will be CHAINED by the
      // time it gets to the errorLogger (so I can experiment with logging a chained
      // error). There is no practical point to having multiple error handlers - well
      // not like this, any way.
      Logger.error(error);
      res.status(500)
        .type("text/plain")
        .send("Something went wrong!");
      next(new AppError("Thrown in Try Block", error));
    }
  )

  // Listen for uncaught exceptions - these are errors that are thrown outside the
  // context of the Express.js route handlers and other proper async request handling.
  process.on(
    "uncaughtException",
    (error: any): void => {
      // NOTE: We know that the error-logger is available at this point because the
      // process event-handler would have never been attached if we didn't make it
      // this far in the control flow of the page.
      Logger.error(error);
    }
  );
}