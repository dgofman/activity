import BaseDev, { D3, D3Select, Utils, FObject, ModalDialog, DragEvent, Zoom, ZoomEvent } from "./Base";
import Locales from "../locales/main";
type UMLTypes = "action" | "start" | "condition" | "fork" | "end";

enum JoinType {
    TO,
    LEFT,
    RIGHT
}

interface DataParams {
    id?: string,
    type: UMLTypes,
    uuid: string,
    x: number,
    y: number,
    title: string
}
interface DataItem extends DataParams {
    join: Array<[JoinType, string]>,
    labels?: Array<string>
}

interface JoinItem {
    to: string,
    from: string,
    type: JoinType,
    join: Array<[JoinType, string]>,
    overlayLine?: D3Select,
    drawLine?: D3Select
}

const Settings = {
    startSize: 10,
    endSize: 15,
    actionSize: 50,
    conditionSize: 40,
    conditionLabels: [100, 18],
    forkSize: [80, 15],
    forkSpace: 5,
    deleteSize: 10,
    gearOffseX: 3,
    gearOffsetW: 20,
    gearSize: 22
};

const nodesInfo: { [uuid: string]: { data: DataItem, joins: { [uuid: string]: JoinType } } } = {};

const joinLines: Array<JoinItem> = [];

let diagramId: number | null = Utils.window.Id;
const data: DataItem[] = Utils.window.Data;

type Diagram = {
    id?: number,
    name: string,
    path: string,
    isDefault: boolean
}
const diagrams: Array<Diagram> = [];

class MainDev extends BaseDev {
    protected _confirmDialog: ModalDialog = {} as ModalDialog;
    protected _renameDialog: ModalDialog = {} as ModalDialog;
    protected _renameCondDialog: ModalDialog = {} as ModalDialog;
    protected _saveAsDialog: ModalDialog = {} as ModalDialog;
    protected _openDialog: ModalDialog = {} as ModalDialog;
    protected _board: D3Select = {} as D3Select;
    protected _board_bg: D3Select = {} as D3Select;
    protected _g: D3Select = {} as D3Select;
    protected _deleteSymbol: D3Select = {} as D3Select;
    protected _menupopup: D3Select = {} as D3Select;
    protected _nodepopup: D3Select = {} as D3Select;
    protected _sidePanel: D3Select | undefined;

    constructor() {
        super(["d3"], (d3: D3): void => {
            this.d3 = d3;
            this.parent = d3.select("section");
            this.svg = this.parent.select("svg");

            this._board = this.svg
                .append("svg")
                .attr("id", "board");

            this._board_bg = this._board.append("rect")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("style", "fill-opacity:0");

            this._g = this._board.append("g")
                .classed("g-zoom", true);

            this._g.append("g")
                .classed("lines", true);
            this._g.append("g")
                .classed("nodes", true);

            this.initMenu(d3);
            this.initNodes(d3);
            this.initLines(d3);

            const bbox = this.size(),
                zoom = d3.zoom().scaleExtent([0.1, 10])
                    .extent([[0, 0], [bbox.width, bbox.height]])
                    .on("zoom", (): void => {
                        const e = d3.event as ZoomEvent;
                        if (e.transform && !isNaN(e.transform.x) && !isNaN(e.transform.y)) {
                            this._g.attr("transform", d3.event.transform);
                            if (this.isIE) {
                                d3.selectAll("g.nodes>g").raise(); //bug in IE
                            }
                        }
                    });
            this.svg.call(zoom)
                //.on("wheel.zoom", null)
                .on("dblclick.zoom", null);

            const defs = this.svg.append("defs");
            this._deleteSymbol = this.svg.append("use")
                .attr("xlink:href", "svg/icons.svg#delete")
                .attr("width", Settings.deleteSize * 2)
                .attr("height", Settings.deleteSize * 2)
                .classed("delete-marker hidden", true);

            const size = Math.sqrt(Settings.conditionSize * Settings.conditionSize * 2) / 2;
            this.intArrow(defs, size).attr("id", "arrow_condition");
            this.intArrow(defs, size, true).attr("id", "arrow_condition_active");
            this.intArrow(defs, Settings.actionSize).attr("id", "arrow_action");
            this.intArrow(defs, Settings.actionSize, true).attr("id", "arrow_action_active");
            this.intArrow(defs, Settings.endSize).attr("id", "arrow_end");
            this.intArrow(defs, Settings.endSize, true).attr("id", "arrow_end_active");
            this.intArrow(defs, Settings.forkSize[1] / 2).attr("id", "arrow_fork")
            this.intArrow(defs, Settings.forkSize[1] / 2, true).attr("id", "arrow_fork_active");

            this._sidePanel = this.initSidePanel(d3, this.svg);
            this.buildTree(d3, this._sidePanel);

            this.initZoom(d3, zoom);

            this._nodepopup = d3.select("body").append("ul")
                .classed("popup hidden", true)
                .on("mouseover", (): void => {
                    d3.event.stopPropagation();
                })
                .on("click", (): void => {
                    this._nodepopup.classed("hidden", true);
                });

            this.parent.on("mouseover", (): void => {
                this._nodepopup.classed("hidden", true);
            });

            Utils.json((err: Error | null, rows: any): void => {
                if (!err) {
                    Array.prototype.push.apply(diagrams, rows);
                }
            }, "/main/diagrams");

            this._confirmDialog = new ModalDialog(d3, null, [Locales.yes, Locales.no], ".confirm");
            this._renameDialog = new ModalDialog(d3, Locales.rename, [Locales.apply, Locales.cancel], ".rename");
            this._renameCondDialog = new ModalDialog(d3, Locales.rename, [Locales.apply, Locales.cancel], ".condition");
            this._saveAsDialog = new ModalDialog(d3, Locales.saveAsTitle, [Locales.apply, Locales.cancel], ".saveas");
            this._openDialog = new ModalDialog(d3, Locales.open, [Locales.ok, Locales.cancel], ".open");
        });
    }

    intArrow(defs: D3Select, gapX: number, isActive: boolean = false): D3Select {
        const width = 10,
            marker = defs.append("marker")
                .attr("viewBox", Utils.format("0 -5 {0} {0}", [width]))
                .attr("refX", gapX + width + 1)
                .attr("markerWidth", width)
                .attr("markerHeight", width)
                .attr("orient", "auto")
                .classed("arrow_active", isActive);

        marker.append("path")
            .attr("d", Utils.format("M0,-5L{0},0L0,5", [width]));
        return marker;
    }

    initNodes(d3: D3): void {
        let joinTo: D3Select | undefined,
            gData = this._g
                .select("g.nodes")
                .selectAll("g.node")
                .data(data, (d: DataItem): string => {
                    return d.uuid;
                });

        gData.exit().remove();

        const nodes = gData.enter()
            .append("g")
            .classed("node", true)
            .attr("type", (d: DataItem): string => {
                return d.type
            })
            .attr("uuid", (d: DataItem): string => {
                return d.uuid;
            })
            .attr("transform", (d: DataParams): string => {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .on("mouseover", (_d: DataParams, index: number, elems: SVGGElement[]): void => {
                this.select(index, elems).raise();
            })
            .call(
                d3.drag()
                    .on("drag", (d: DataParams, index: number, elems: SVGGElement[]): void => {
                        const e = d3.event as DragEvent;
                        if (!isNaN(e.dx) && !isNaN(e.dy)) {
                            d.x += e.dx;
                            d.y += e.dy;
                            this.select(index, elems).attr("transform", "translate(" + d.x + "," + d.y + ")");
                            this.drawLines();
                        }
                    })
            ).each((d: DataItem, index: number, elems: SVGGElement[]): void => {
                const g = this.select(index, elems);

                this.createSymbol(g, d.type, d.title);
                switch (d.type) {
                    case "start":
                        this._menupopup
                            .select("li[type=start]")
                            .classed("hidden", true);
                        break;
                    case "end":
                        this._menupopup
                            .select("li[type=end]")
                            .classed("hidden", true);
                        break;
                    case "condition":
                        g.append("g")
                            .classed("labels", true);
                        break;
                    case "action":
                        const xy = 15 - Settings.actionSize,
                            wh = Settings.actionSize * 2 - 30;
                        new FObject(g, "div", "title")
                            .move(xy + "pt", xy + "pt")
                            .size(wh + "pt", wh + "pt").obj
                            .attr("title", (d: DataParams): string => {
                                return d.title;
                            })
                            .text((d: DataParams): string => {
                                return d.title;
                            });
                        break;
                }

                const gear = g.append("svg")
                    .attr("y", -(Settings.gearSize / 2))
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .classed("gear", true),
                    width = this.node(g).getBBox().width;

                Utils
                    .use(gear, "gear", (use: D3Select): void => {
                        use.attr("x", width / 2 + Settings.gearOffseX);
                    })
                    .attr("width", width / 2 + Settings.gearSize + Settings.gearOffsetW)
                    .attr("height", Settings.gearSize + 2)
                    .attr("y", -2);
            });

        nodes.selectAll(".gear").on("mouseover", null)
            .on("mouseover", (d: DataItem, index: number, elems: SVGGElement[]): void => {
                d3.event.stopPropagation();
                if (this._nodepopup.classed("hidden")) {
                    const map: { [uuid: string]: DataItem } = {};
                    this._nodepopup
                        .html(null)
                        .classed("left", false)
                        .classed("hidden", false)
                        .append("li")
                        .on("click", (): void => {
                            this._confirmDialog.event((index: number): boolean => {
                                if (index === 0) {
                                    data.some((item: DataItem, index: number): boolean => {
                                        if (d.uuid === item.uuid) {
                                            for (let i = joinLines.length - 1; i >= 0; i--) {
                                                const item: JoinItem = joinLines[i];
                                                if (item.to === d.uuid || item.from === d.uuid) {
                                                    item.join.some((join: [JoinType, string], index: number): boolean => {
                                                        const [, uuid] = join;
                                                        if (uuid === item.to || uuid === item.from) {
                                                            item.join.splice(index, 1);
                                                        }
                                                        return false;
                                                    });
                                                    joinLines.splice(i, 1);
                                                }
                                            }
                                            data.splice(index, 1);
                                            this.initNodes(d3);
                                            this.initLines(d3);
                                            delete nodesInfo[d.uuid];

                                            this._menupopup
                                                .select("li[type=" + d.type + "]")
                                                .classed("hidden", false);
                                            return true;
                                        }
                                        return false;
                                    });
                                }
                                return true;
                            }).show(false, Locales.delete_node);
                        })
                        .append("a")
                        .text(Locales.delete);

                    let items: Array<[D3Select | null, "joinTo" | "joinFrom" | "joinLeft" | "joinRight"]>;
                    if (d.type === "condition") {
                        items = [[null, "joinFrom"], [null, "joinLeft"], [null, "joinRight"]];
                    } else {
                        items = [[null, "joinTo"], [null, "joinFrom"]];
                    }

                    this._nodepopup
                        .append("li")
                        .on("click", (): void => {
                            const dialog = d.type === "condition" ? this._renameCondDialog : this._renameDialog;
                            dialog.setValue("#title", d.title)
                                .setValue("#success", d.labels ? d.labels[0] : Locales.yes)
                                .setValue("#exception", d.labels ? d.labels[1] : Locales.no);
                            dialog.event((index: number): boolean => {
                                if (index === 0) {
                                    d.title = dialog.getValue("#title");
                                    if (dialog === this._renameCondDialog) {
                                        d.labels = [
                                            dialog.getValue("#success"),
                                            dialog.getValue("#exception")
                                        ];
                                    }
                                    this.invalidateNodes(d3);
                                }
                                return true;
                            }).show();
                        })
                        .append("a")
                        .text(Locales.rename);

                    data.forEach((item): void => {
                        if (item.uuid !== d.uuid && !item.join.filter(join => join[1] === d.uuid).length) {
                            map[item.uuid] = item;
                        }
                    });

                    const endPoints: Array<DataItem> = [];
                    for (let uuid in map) {
                        const param = map[uuid];
                        if (param.type !== "start" &&
                            !d.join.filter(join => join[1] === param.uuid).length) {
                            if (param.type === "end") {
                                endPoints.push(param);
                                continue;
                            }
                            for (let item of items) {
                                let [ul, name] = item;
                                if ((d.type === "start" && name === "joinFrom") ||
                                    (d.type === "end" && name === "joinTo") ||
                                    (d.type === "fork" && name === "joinFrom") ||
                                    (d.type === "condition" && name === "joinFrom" && param.type === "fork")) {
                                    continue;
                                }
                                if (ul === null) {
                                    ul = item[0] = this._nodepopup
                                        .append("li")
                                        .call((li: D3Select): void => {
                                            li.append("span");
                                            li.append("a")
                                                .text(Locales[name]);
                                        })
                                        .append("ul")
                                        .classed(name, true);
                                }
                                ul.append("li").classed("join " + name, true).attr("uuid", param.uuid).text(param.title);
                            }
                        }
                    }
                    const ul = this._nodepopup.select("ul.joinTo");
                    endPoints.forEach((d: DataItem): void => {
                        ul.append("li").classed("join joinTo", true).attr("uuid", d.uuid).text(d.title);
                    });

                    const gear = this.select(index, elems),
                        r1: ClientRect | DOMRect = this.node(this._board_bg).getBoundingClientRect(),
                        r2: ClientRect | DOMRect = this.node(this._nodepopup).getBoundingClientRect(),
                        r3: ClientRect | DOMRect = this.node(gear).getBoundingClientRect(),
                        matrix = <SVGMatrix>this.node(gear).getScreenCTM(),
                        offset1 = (Settings.gearOffsetW - Settings.gearOffseX) * matrix.a,
                        offset2 = Settings.gearSize * matrix.a + offset1,
                        point: SVGPoint = this.createSVGPoint();

                    point.x = r3.left + r3.width - offset2;
                    point.y = r3.top + r3.height;

                    if (point.x + r2.width > r1.left + r1.width) {
                        point.x = r3.left + r3.width - offset1 - r2.width;
                        this._nodepopup.classed("left", true);
                    }
                    if (point.y + r2.height > r1.top + r1.height) {
                        point.y = r3.top - r2.height + 2;
                    }

                    this._nodepopup
                        .attr("style", Utils.format("left: {0}px; top: {1}px", [point.x, point.y]))
                        .selectAll(".popup > li")
                        .on("mouseover", (_d: DataItem, index: number, elems: SVGGElement[]): void => {
                            const li = this.select(index, elems),
                                ul = li.select("ul");
                            ul.attr("style", (): string => {
                                let margin = 0,
                                    r4: ClientRect | DOMRect = this.node(li).getBoundingClientRect(),
                                    r5: ClientRect | DOMRect = this.node(ul).getBoundingClientRect();
                                if (point.x + r2.width + r5.width > r1.left + r1.width) {
                                    this._nodepopup.classed("left", true);
                                }
                                if (point.y + r2.height + r5.height - r4.height > r1.top + r1.height) {
                                    margin -= r5.height - r4.height;
                                }
                                return "margin-top: " + margin + "px";
                            });
                        });

                    this._nodepopup.selectAll("li.join")
                        .on("mouseover", (_d: DataItem, index: number, elems: SVGGElement[]): void => {
                            const li = this.select(index, elems),
                                uuid = li.attr("uuid");
                            joinTo = this._g.select("g[uuid='" + uuid + "']")
                                .classed("joinTo", true);

                        })
                        .on("mouseleave", (): void => {
                            if (joinTo) {
                                joinTo.classed("joinTo", false);
                            }
                        });

                    this._nodepopup.selectAll("li.joinTo")
                        .on("mousedown", (_d: DataItem, index: number, elems: SVGGElement[]): void => {
                            this.addData(d3, JoinType.TO, d.join, this.select(index, elems).attr("uuid"));
                        });

                    this._nodepopup.selectAll("li.joinFrom")
                        .on("mousedown", (_d: DataItem, index: number, elems: SVGGElement[]): void => {
                            const uuid = this.select(index, elems).attr("uuid");
                            this.addData(d3, JoinType.TO, map[uuid].join, d.uuid);
                        });

                    this._nodepopup.selectAll("li.joinLeft")
                        .on("mousedown", (_d: DataItem, index: number, elems: SVGGElement[]): void => {
                            this.addData(d3, JoinType.LEFT, d.join, this.select(index, elems).attr("uuid"));
                        });

                    this._nodepopup.selectAll("li.joinRight")
                        .on("mousedown", (_d: DataItem, index: number, elems: SVGGElement[]): void => {
                            this.addData(d3, JoinType.RIGHT, d.join, this.select(index, elems).attr("uuid"));
                        });
                }
            });

        this.invalidateNodes(d3);
    }

    addData(d3: D3, type: JoinType, join: Array<[JoinType, string]>, uuid: string): void {
        join.push([type, uuid]);
        this.invalidateNodes(d3);
        this.initLines(d3);
    }

    invalidateNodes(d3: D3): void {
        joinLines.length = 0;
        Object.keys(nodesInfo).forEach(key => delete nodesInfo[key]);

        data.forEach((d: DataItem): void => {
            const node: D3Select = d3.select(".nodes>g[uuid='" + d.uuid + "']");

            nodesInfo[d.uuid] = { data: d, joins: {} };
            d.join.forEach((join: [JoinType, string]): void => {
                const [type, uuid] = join;
                nodesInfo[d.uuid].joins[uuid] = type;
                joinLines.push({ from: d.uuid, to: uuid, type: type, join: d.join });
            });

            if (d.type === "condition") {
                const [x, y] = Settings.conditionLabels,
                    width = Math.sqrt(Settings.conditionSize * Settings.conditionSize * 2) / 2,
                    labels = node.select(".labels");
                labels.select(".left").remove();
                labels.select(".right").remove()

                if (d.join.filter(join => join[0] === JoinType.LEFT).length) {
                    new FObject(labels, "div", "left")
                        .move(-x, -y)
                        .size(x - width / 2, y).obj
                        .attr("title", (d: DataItem): string => {
                            return d.labels ? d.labels[0] : Locales.yes;
                        })
                        .text((d: DataItem): string => {
                            return d.labels ? d.labels[0] : Locales.yes;
                        });
                }
                if (d.join.filter(join => join[0] === JoinType.RIGHT).length) {
                    new FObject(labels, "div", "right")
                        .move(width / 2, -y)
                        .size(x - width / 2, y).obj
                        .attr("title", (d: DataItem): string => {
                            return d.labels ? d.labels[1] : Locales.no;
                        })
                        .text((d: DataItem): string => {
                            return d.labels ? d.labels[1] : Locales.no;
                        });
                }
            }
            node.select(".title div[title]")
                .attr("title", d.title)
                .text(d.title);
            node.select("title").text(d.title);
        });
    }

    initLines(d3: D3): void {
        const gData = this._g
            .select("g.lines")
            .selectAll("g")
            .data(joinLines, (d: JoinItem): string => {
                return d.from + "_" + d.to;
            });

        gData.exit().remove();

        gData
            .enter()
            .filter((d: JoinItem): boolean => {
                return !!nodesInfo[d.to] && !!nodesInfo[d.from];
            })
            .append("g")
            .each((d: JoinItem, index: number, elems: SVGGElement[]): void => {
                const g = this.select(index, elems);
                g.attr("from", d.from);
                g.attr("to", d.to);
                g.attr("type", d.type);
                g.classed(nodesInfo[d.to].data.type, true);

                g.append("polyline")
                    .classed("overlay", true)
                    .attr("fill", "none")
                    .attr("style", "stroke-width:10; stroke:rgba(0, 0, 0, 0)")
                    .on("mouseover", (): void => {
                        if ((<MouseEvent>d3.event).buttons === 0) {
                            this._deleteSymbol.classed("hidden", false);
                            g.dispatch("mousemove");
                            g.raise();
                        }
                    })
                    .on("mousemove", (): void => {
                        const [x, y] = this.mouseXY(d3);
                        if (!isNaN(x) && !isNaN(y)) {
                            this._deleteSymbol.attr("x", x - Settings.deleteSize)
                                .attr("y", y - Settings.deleteSize);
                        }
                    })
                    .on("mouseout", (): void => {
                        this._deleteSymbol.classed("hidden", true);
                    })
                    .on("click", (d: JoinItem): void => {
                        if (!this._deleteSymbol.classed("hidden")) {
                            this._confirmDialog.event((index: number): boolean => {
                                if (index === 0) {
                                    for (let i = joinLines.length - 1; i >= 0; i--) {
                                        const item: JoinItem = joinLines[i];
                                        if (item.from === d.from && item.to === d.to) {
                                            item.join.some((join: [JoinType, string], index: number): boolean => {
                                                const [, uuid] = join;
                                                if (uuid === d.from || uuid === d.to) {
                                                    item.join.splice(index, 1);
                                                }
                                                return false;
                                            });
                                            joinLines.splice(i, 1);
                                            this.invalidateNodes(d3);
                                            this.initLines(d3);
                                            break;
                                        }
                                    }
                                }
                                return true;
                            }).show(false, Locales.delete_link);
                        }
                    });

                g.append("polyline")
                    .classed("draw", true)
                    .attr("stroke", "black")
                    .attr("stroke-linejoin", "miter")
                    .attr("fill", "none");
            });

        this.drawLines();
    }

    drawLines(): void {
        joinLines.forEach((d: JoinItem): void => {
            const to: DataItem = nodesInfo[d.to].data,
                from: DataItem = nodesInfo[d.from].data,
                conditionX = Settings.conditionLabels[0],
                forkH = Settings.forkSize[1];
            if (!!to && !!from) {
                if (!d.drawLine || !d.overlayLine) {
                    const g = this._g.select(Utils.format("g.lines>g[from='{0}'][to='{1}'][type='{2}']", [d.from, d.to, d.type]));
                    d.drawLine = g.select("polyline.draw");
                    d.overlayLine = g.select("polyline.overlay");
                }
                let points: string;
                if (Math.abs(to.y - from.y) > Settings.actionSize + 15) {
                    if (d.type === JoinType.LEFT && from.y < to.y) {
                        points = Utils.format("{0},{1} {4},{1}, {4},{5} {2},{5} {2},{3}", [from.x, from.y, to.x, to.y, from.x - conditionX, from.y + Settings.conditionSize]);
                    } else if (d.type === JoinType.RIGHT && from.y < to.y) {
                        points = Utils.format("{0},{1} {4},{1}, {4},{5} {2},{5} {2},{3}", [from.x, from.y, to.x, to.y, from.x + conditionX, from.y + Settings.conditionSize - 5]);
                    } else {
                        points = Utils.format("{0},{1} {2},{1} {2},{3}", [from.x, from.y, to.x, to.y]);
                    }
                } else {
                    if (d.type === JoinType.LEFT) {
                        points = Utils.format("{0},{1} {4},{1} {4},{3} {2},{3}", [from.x, from.y, to.x, to.y, from.x - conditionX]);
                    } else if (d.type === JoinType.RIGHT) {
                        points = Utils.format("{0},{1} {4},{1} {4},{3} {2},{3}", [from.x, from.y, to.x, to.y, from.x + conditionX]);
                    } else {
                        points = Utils.format("{0},{1} {0},{3}, {2},{3}", [from.x, from.y, to.x, to.y]);
                    }
                }

                if (from.type === "fork" && from.join.length > 1) {
                    const index: number = parseInt(from.join.reduce((uuid: string, item: [JoinType, string], index: number): string => {
                        return (uuid === item[1]) ? String(index) : uuid;
                    }, to.uuid));
                    if (!isNaN(index)) {
                        const x = from.x - (Settings.forkSpace * from.join.length / 2) + (Settings.forkSpace * index),
                            y = from.y - (from.y < to.y ? -forkH / 2 : forkH / 2);
                        points = Utils.format("{0},{1} {0},{3}, {2},{3}", [x, y, to.x, to.y]);
                    }
                }
                d.overlayLine.attr("points", (): string => {
                    return points;
                });
                d.drawLine.attr("points", (): string => {
                    return points;
                });
            }
        });
    }

    initSidePanel(_d3: D3, parent: D3Select): D3Select {
        const sidePanel = this.parent.select("#sidePanel");

        const sideButton = parent.append("svg")
            .attr("y", "40%")
            .attr("id", "sideButton"),
            sideButtonIcon = sideButton.append("use")
                .attr("xlink:href", "svg/icons.svg#sideButtonIn");

        sideButton.append("rect")
            .attr("stroke", "none")
            .attr("fill", "transparent")
            .attr("width", 25)
            .attr("height", 80)
            .on("click", (): void => {
                sideButton.classed("open", (): boolean => {
                    const b = sideButton.classed("open");
                    sideButtonIcon.attr("xlink:href", b ? "svg/icons.svg#sideButtonIn" : "svg/icons.svg#sideButtonOut");
                    sidePanel.classed("close", !b);
                    return !b;
                });
            });
        return sidePanel;
    }

    buildTree(d3: D3, sidePanel: D3Select): void {
        const tree: [any] = Utils.window.Tree,
            ul = sidePanel
                .classed("tree", true)
                .append("ul");
        for (let node of tree) {
            const li1 = ul.append("li");
            li1.append("input")
                .attr("type", "checkbox")
                .attr("id", node.id);
            li1.append("label")
                .attr("for", node.id)
                .attr("href", "#")
                .attr("title", node.name)
                .text(node.name);
            const ul1 = li1.append("ul");
            for (let subnode of node.nodes) {
                const li2 = ul1.append("li")
                    .classed("hidden", false);
                li2.append("input")
                    .attr("type", "checkbox")
                    .attr("id", subnode.id);
                li2.append("label")
                    .attr("for", subnode.id)
                    .attr("href", "#")
                    .attr("title", subnode.name)
                    .text(subnode.name);
                const ul2 = li2.append("ul");
                for (let node of subnode.nodes) {
                    const li3 = ul2.append("li")
                        .classed("hidden", false);
                    li3.append("label")
                        .attr("for", node.id)
                        .attr("href", "#")
                        .attr("draggable", "true")
                        .attr("title", node.name)
                        .text(node.name);
                }
            }
        }

        this.initDragNode(d3, sidePanel);
    }

    initDragNode(d3: D3, sidePanel: D3Select): void {
        let r: ClientRect | DOMRect = this.node(this.svg).getBoundingClientRect(),
            dragTarget: D3Select | null,
            event: MouseEvent;
        sidePanel.selectAll("label[draggable]").call(d3.drag().on("start", (): void => {
            event = d3.event.sourceEvent;
        }).on("drag", (_d: DataItem, index: number, nodes: Element[] | ArrayLike<Element>): void => {
            if (!dragTarget) {
                dragTarget = this.parent.append("div")
                    .classed("treeItemDrag", true)
                    .attr("id", nodes[index].getAttribute("for") || "")
                    .text(nodes[index].innerHTML);
            } else {
                dragTarget.attr("style", (): string => {
                    return Utils.format("position: absolute; left:{0}px; top: {1}px; transform: translate(-{2}px, -{3}px)",
                        [d3.event.sourceEvent.x, d3.event.sourceEvent.y - r.top, event.offsetX, event.offsetY]);
                });
            }
            dragTarget.classed("denied", this.mouse(this.svg).x < 0);
        }).on("end", (): void => {
            if (dragTarget) {
                if (!dragTarget.classed("denied")) {
                    const [x, y] = d3.mouse(this._g.node());
                    data.push({
                        title: dragTarget.text(), type: "action", uuid: Utils.uuid, id: dragTarget.attr("id"), x, y,
                        join: []
                    });
                    this.initNodes(d3);
                }
                dragTarget.remove();
                dragTarget = null;
            }
        }));
    }

    initZoom(d3: D3, zoom: Zoom): void {

        const zoomDiv = d3.select("section")
            .append("div")
            .classed("zoom", true),
            zoomIn = zoomDiv.append("svg")
                .attr("width", 30)
                .attr("height", 30)
                .attr("viewBox", "0 0 70 70"),
            zoomOut = zoomIn.clone();

        Utils.use(zoomIn, "zoomIn")
            .on("click", (): void => {
                zoom.scaleBy(this.svg, 1.1);
            });

        Utils.use(zoomOut, "zoomOut")
            .on("click", (): void => {
                zoom.scaleBy(this.svg, 0.9);
            });
    }

    initMenu(d3: D3): void {
        const size = 24,
            reset = (): D3Select => {
                this._menupopup.classed("hidden", true);
                return this.svg
                    .on("mouseover", null)
                    .on("mousemove", null)
                    .on("click", null);
            },
            div = d3.select("section")
                .append("div")
                .classed("menu", true)
                .on("mouseover", (): void => {
                    reset().on("mouseover", reset);
                    this._board.select("g.newsymbol").remove();
                    this._menupopup.classed("hidden", false);
                });

        Utils.use(
            div.append("svg")
                .attr("width", size)
                .attr("height", size),
            "menu", (use: D3Select): void => {
                use.classed("use-menu", true);
            });

        this._menupopup = this.parent
            .append("ul")
            .classed("popup hidden", true);

        const types: Array<UMLTypes> = ["start", "condition", "fork", "end"];
        types.forEach((type: UMLTypes): void => {
            this._menupopup
                .append("li")
                .attr("type", type)
                .text(Locales[type]);
        });

        this._menupopup
            .append("li")
            .classed("separator", true)
            .text(Locales.new)
            .on("click", (): void => {
                reset();
                this._confirmDialog.event((index: number): boolean => {
                    if (index === 0) {
                        diagramId = null;
                        data.length = 0;
                        this._g.select("g.lines").html("");
                        this._g.select("g.nodes").html("");
                    }
                    return true;
                }).show(false, Locales.lost_changes);
            });

        this._menupopup
            .append("li")
            .text(Locales.open)
            .on("click", (): void => {
                reset();
                const sel = this._openDialog
                    .show()
                    .select("select");

                sel.selectAll("option")
                    .data(diagrams)
                    .enter()
                    .append("option")
                    .attr("value", (d: any): string => { return d.id; })
                    .text((d: any): string => { return d.name; });
                this._openDialog.event((index: number): boolean => {
                    if (index === 0) {
                        window.location.href = "/main?diagramId=" + sel.property("value");
                    }
                    return true;
                });
            });

        this._menupopup
            .append("li")
            .text(Locales.saveAs)
            .on("click", (): void => {
                reset();
                const item: Array<Diagram> = diagrams.filter(diagram => diagram.id === diagramId),
                    diagram: Diagram = item.length ? item[0] : { name: "", path: "", isDefault: false },
                    dialog: ModalDialog = this._saveAsDialog.show();
                dialog.setValue("#name", diagram.name),
                    dialog.setValue("#path", diagram.path),
                    dialog.select("#isDefault").property("checked", diagram.isDefault);
                dialog.event((index: number): boolean => {
                    if (index === 0) {
                        Utils.json((err: Error | null, id: number): void => {
                            if (err) {
                                dialog.select(".error").text(err.message).attr("title", err.message);
                            } else {
                                diagram.name = dialog.getValue("#name");
                                diagram.path = dialog.getValue("#path");
                                diagram.isDefault = dialog.select("#isDefault").property("checked");
                                if (!diagramId) {
                                    diagram.id = diagramId = id;
                                    diagrams.push(diagram);
                                }
                                dialog.hide();
                            }
                        }, "/main", {
                                id: diagramId,
                                name: dialog.getValue("#name"),
                                path: dialog.getValue("#path"),
                                data: data,
                                isDefault: dialog.select("#isDefault").property("checked")
                            });
                        return false;
                    }
                    return true;
                });
            });

        this._menupopup
            .selectAll("li[type]")
            .on("click", (_d: string, index: number, elems: SVGGElement[]): void => {
                const type = this.select(index, elems).attr("type") as UMLTypes,
                    matrix = <SVGMatrix>this.node(this._g).getScreenCTM(),
                    g: D3Select = this._board.append("g")
                        .classed("newsymbol", true)
                        .attr("type", type),
                    move = (): void => {
                        const [x, y] = this.mouseXY(d3);
                        if (!isNaN(y) && !isNaN(x)) {
                            g.attr("transform", Utils.format("translate({0}, {1}) scale({2})", [x, y, matrix.a]));
                        }
                    };

                let usedIndexes = new Array(data.length),
                    title = Locales[type];
                if (type === "condition" || type === "fork") {
                    data.forEach(d => {
                        let pair = d.title.split(title);
                        if (pair.length > 1) {
                            usedIndexes.push(pair[1]);
                        }
                    });
                    for (let i = 1; i < usedIndexes.length; i++) {
                        if (usedIndexes.indexOf(String(i)) === -1) {
                            title += i;
                            break;
                        }
                    }
                }

                reset()
                    .on("mousemove", move)
                    .on("click", (): void => {
                        const [x, y] = d3.mouse(this._g.node());
                        data.push({
                            title: title, type: type, uuid: Utils.uuid, x, y,
                            join: []
                        });
                        this.initNodes(d3);

                        g.remove();
                        reset();
                    });

                this.createSymbol(g, type, title);
                move();
            });

        this._menupopup.attr("style",
            Utils.format("transform: translate(0, {0}px); top: {1}; right: {2}",
                [size, div.style("top"), div.style("right")]));
    }

    mouseXY(d3: D3): Array<number> {
        const r: ClientRect | DOMRect = this.node(this._board_bg).getBoundingClientRect();
        return [d3.event.x - r.left, d3.event.y - r.top];
    }

    createSymbol(parent: D3Select, type: UMLTypes, title: string): void {
        switch (type) {
            case "start":
                parent.append("circle")
                    .attr("r", Settings.startSize)
                    .append("title")
                    .text(title);
                break;
            case "end":
                parent.append("circle")
                    .attr("r", Settings.endSize);
                parent.append("circle")
                    .attr("r", Settings.endSize - 4)
                    .append("title")
                    .text(title);
                break;
            case "condition":
                parent.append("rect")
                    .classed("symbol", true)
                    .attr("x", -Settings.conditionSize / 2)
                    .attr("y", -Settings.conditionSize / 2)
                    .attr("width", Settings.conditionSize)
                    .attr("height", Settings.conditionSize)
                    .attr("transform", "rotate(45)")
                    .append("title")
                    .text(title);
                break;
            case "fork":
                const [w, h] = Settings.forkSize;
                parent.append("path")
                    .classed("symbol", true)
                    .attr("transform", "translate(-" + (w / 2) + ",-" + (h / 2) + ")")
                    .attr("d", Utils.format("M0,0 h{0} v{1} h-{2} v{3} h{2} v{1} h-{0} v-{1} h{2} v-{3} h-{2}z", [w, 2, w / 2 + h / 2, h - 4]))
                    .append("title")
                    .text(title);
                break;
            default:
                parent.append("rect")
                    .classed("symbol", true)
                    .attr("x", -Settings.actionSize)
                    .attr("y", -Settings.actionSize)
                    .attr("width", Settings.actionSize * 2)
                    .attr("height", Settings.actionSize * 2)
                    .attr("rx", 15)
                    .attr("ty", 15);
                break;
        }
    }
}
Utils.window.main = new MainDev();