import { Selection, BaseType, ValueFn, ContainerElement } from "d3-selection";
import { DragBehavior, D3DragEvent, DraggedElementBaseType } from "d3-drag";
import { ZoomBehavior, ZoomedElementBaseType, D3ZoomEvent } from "d3-zoom";


export type D3Select = Selection<any, any, any, any>;
export type EventCallback = (index: number, dialog: ModalDialog, listener: ValueFn<Element, any, void>) => boolean;
export type ZoomEvent = D3ZoomEvent<ZoomedElementBaseType, any>;
export type DragEvent = D3DragEvent<DraggedElementBaseType, any, any>;
export type Zoom = ZoomBehavior<ZoomedElementBaseType, any>;

export type Callback = (err: Error | null, data?: any) => void;

export interface D3 extends D3Select {
    drag(): DragBehavior<DraggedElementBaseType, any, any>;
    event: DragEvent | ZoomEvent | D3DragEvent<DraggedElementBaseType, any, any> | any;
    zoom: () => Zoom;
    mouse(container: ContainerElement): [number, number];
}

export default abstract class BaseDev {
    readonly isIE: boolean;
    readonly isFireFox: boolean;
    protected d3: D3 = {} as D3;
    protected parent: D3Select = {} as D3;
    protected svg: D3Select = {} as D3;
    constructor(modules: string[], ready: Function) {
        const requirejs: Require = Utils.window.requirejs as Require;
        requirejs.config({
            baseUrl: "/vendor",

            paths: {
                "jquery": "jquery/dist/jquery",
                "d3": "d3/d3"
            }
        });

        requirejs(modules, ready, (err: Error): void => {
            this.error(err);
        });

        this.isFireFox = Utils.isFirefox;
        this.isIE = Utils.isIE;
    }

    select(index: number, elems: SVGGElement[] | ArrayLike<BaseType>): D3Select {
        return this.d3.select(<any>elems[index]);
    }

    error(err: any): void {
        console.error(err);
    }

    size(): SVGRect {
        return this.node(this.svg).getBBox();
    }

    node(element: D3Select): SVGGraphicsElement {
        return <SVGGraphicsElement>element.node();
    }

    mouse(element: D3Select): WebKitPoint {
        const [x, y] = this.d3.mouse(element.node());
        return { x, y };
    }

    createSVGPoint(): SVGPoint {
        const svg: SVGSVGElement = this.node(this.svg) as SVGSVGElement;
        return svg.createSVGPoint();
    }
}

interface Require {
    config(config: any): Require;
    (modules: string[], ready: Function, errback: Function): void;
    defined(module: string): boolean;
}

export class Utils {
    static get window(): any {
        return window;
    }

    static get uuid(): string {
        return "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".replace(/[x]/g, (c: string): string => {
            var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static format(str: string, args: any[]): string {
        for (var i = 0; i < args.length; i++) {
            var regexp = new RegExp("\\{" + i + "\\}", "gi");
            str = str.replace(regexp, args[i]);
        }
        return str;
    }

    static use(parent: D3Select, svgId: string, call?: (use: D3Select) => void): D3Select {
        const use = parent.append("use")
            .attr("xlink:href", "svg/icons.svg#" + svgId);
        if (call) {
            call(use);
        }
        return parent.append("rect")
            .attr("stroke", "none")
            .attr("fill", "transparent")
            .attr("width", "100%")
            .attr("height", "100%");
    }

    static json(callback: Callback, path: string, body?: any, method: string = "GET"): void {
        fetch(path, {
            method: body ? "POST" : method,
            body: body ? JSON.stringify(body) : null,
            credentials: "include",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            }
        }).then(res => {
            if (res.redirected) {
                window.location.href = "/";
            } else {
                res.json().then((json) => {
                    if (res.ok) {
                        callback(null, json);
                    } else {
                        callback(json && json.message ? json : { message: json.toString() });
                    }
                });
            }
        });
    }

    static get isIE(): boolean {
        return !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g) || !!navigator.userAgent.match(/Edge/g);
    }

    static get isFirefox(): boolean {
        return !!navigator.userAgent.match(/Firefox/g);
    }
}

export class Component {
    constructor(readonly el: D3Select) {
    }

    classed(names: string, value: boolean, el: D3Select = this.el): this {
        el.classed(names, value);
        return this;
    }

    attr(name: string, value: string | number | boolean, el: D3Select = this.el): this {
        el.attr(name, value);
        return this;
    }

    move(x: number | string, y: number | string, el: D3Select = this.el): this {
        el.attr("x", x)
            .attr("y", y);
        return this;
    }

    size(width: number | string, height: number | string, el: D3Select = this.el): this {
        el.attr("width", width)
            .attr("height", height);
        return this;
    }
}

export class FObject extends Component {
    readonly obj: D3Select;
    constructor(parent: D3Select, type: string, className?: string) {
        super(parent.append("foreignObject"));
        if (className) {
            this.classed(className, true);
        }
        this.obj = this.el.append("xhtml:body")
            .attr("xmlns", "http://www.w3.org/1999/xhtml")
            .append(type);
    }

    text(value: any): this {
        this.obj.text(value);
        return this;
    }
}

export class Button extends Component {
    private readonly _text: D3Select;
    constructor(parent: D3Select, label?: string) {
        super(parent.append("svg")
            .classed("button", true));

        this.el.append("rect")
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("width", "100%")
            .attr("height", "100%");

        const defs = this.el.append("defs");
        new Gradient(defs, "button");
        new Gradient(defs, "button-hover");

        this._text = this.el.append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("dy", Utils.isIE ? "13%" : 0)
            .attr("alignment-baseline", "middle")
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "middle");

        this.size(100, 26).label(label);
    }

    size(width: number, height: number): this {
        return super.size(width, height);
    }

    label(label: string = "Button"): this {
        this._text.text(label);
        return this;
    }

    click(listener: ValueFn<Element, any, void>): this {
        this.el.on("click", listener);
        return this;
    }
}

export class ModalDialog extends Component {

    readonly _outer: D3Select;
    readonly _inner: D3Select;
    readonly _title: D3Select;
    readonly _content: D3Select;
    readonly _footer: D3Select;
    readonly _close: D3Select;

    readonly _originalContent: string;

    private _callback: EventCallback;
    constructor(d3: D3, title?: string | null, buttons: string[] = ["OK"], selector: string = "") {
        super(d3.select(".modal" + selector));

        this._originalContent = this.getContent();

        this._outer = this.el.html("")
            .append("div")
            .classed("outer", true);
        this._inner = this.el.append("div")
            .classed("inner", true);

        this._title = this._inner.append("div").classed("title", true);

        this._content = this._inner.append("div").classed("content", true);

        this._footer = this._inner.append("div").classed("footer", true);

        this._close = this._inner.append("div").classed("close", true);

        Utils.use(this._close.append("svg")
            .attr("width", 20)
            .attr("height", 20), "delete")
            .on("click", (evt): void => {
                if (this._callback(-1, this, evt)) {
                    this.hide();
                }
            });

        buttons.forEach((label, index): Button =>
            new Button(this._footer, label).size(100, 26).click((evt): void => {
                if (this._callback(index, this, evt)) {
                    this.hide();
                }
            }));

        this._callback = (): boolean => { return true; };
        this.title(title);
        this.size(this.el.attr("width") || "400px", this.el.attr("height") || "150px").hide();
    }

    getContent(): string {
        return this.el.html();
    }

    hide(): this {
        this.el.style("visibility", "hidden");
        return this;
    }

    show(reset: boolean = true, value?: string): this {
        if (reset) {
            this._content.html(this._originalContent);
        }
        this.title(value);
        this.el.style("visibility", "visible");
        return this;
    }

    event(callback: EventCallback): this {
        this._callback = callback;
        return this;
    }

    title(value?: string | null): this {
        this._title.text(value || this._title.text());
        return this;
    }

    size(width: string, height: string): this {
        this._inner.style("width", width).style("height", height)
            .style("transform", Utils.format("translate(-{0}px,-{1}px)", [parseFloat(width) / 2, parseFloat(height) / 2]));
        return this;
    }

    select(selector: string): D3Select {
        return this._content.select(selector);
    }

    getValue(selector: string): string {
        return this.select(selector).property("value");
    }

    setValue(selector: string, value: any): ModalDialog {
        this.select(selector).property("value", value);
        return this;
    }
}

export class Gradient extends Component {
    constructor(defs: D3Select, id: string) {
        super(defs.append("linearGradient")
            .attr("id", id)
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", "100%"));

        this.el.append("stop")
            .attr("id", id + "-gradient-start")
            .attr("offset", "0%");

        this.el.append("stop")
            .attr("id", id + "-gradient-stop")
            .attr("offset", "100%");
    }
}