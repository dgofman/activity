import Database, { Callback } from "./Database";
import { IParser } from "./Global";

export default class ExampleParser implements IParser {

    constructor(readonly db: Database) {
    }

    initialize(callback: Callback): void {
        const db: Database = this.db;
        db.getTable(db.TABLE_NODES.name, (err?: Error | null, rows?: any): void => {
            if (err) {
                return callback(err);
            }
            if (!rows.length) {
                db.createTable(db.TABLE_NODES.name, db.TABLE_NODES.create, (err?: Error | null): void => {
                    if (!err) {
                        db.run(null, callback, `${db.TABLE_NODES.insert}
                            (1, 'Node1', NULL, '{"key1": "value1", "key2": "value2", "key3": "value3"}'),
                            (2, 'Node2', 1, '{"key1": "value1"}'),
                            (3, 'Node3', 2, '{"key2": "value2", "key3": "value3"}'),
                            (4, 'Node4', 2, '{"key3": "value3"}'),
                            (5, 'Node5', 1, '{"key1": "value1", "key3": "value3"}'),
                            (6, 'Node6', 5, '{"key1": "value1", "key2": "value2"}'),
                            (7, 'Node7', 5, '{"key1": "value1", "key2": "value2", "key3": "value3"}'),
                            (8, 'Node8', 5, '{"key1": "value1"}'),
                            (9, 'Node9', NULL, '{"key2": "value2"}'),
                            (10, 'Node10', 9, '{"key3": "value3"}'),
                            (11, 'Node11', 10, '{"key2": "value2", "key3": "value3"}');
                            `, []);
                    }
                });
            } else {
                return callback(null, rows);
            }
        });
    }

    getNodes(callback: Callback): void {
        this.db.getNodes(callback);
    }
}