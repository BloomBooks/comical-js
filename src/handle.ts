import { Point, Path, Color, Layer } from "paper";
import { activateLayer } from "./utilities";
import { Tail } from "./tail";

// This class represents one of the handles used to manipulate tails.
export class Handle {
    // Enhance/refactor: with a few more functions, we could make this private.
    handle: Path.Circle;

    // Helps determine unique names for the handles
    static handleIndex = 0;

    constructor(layer: Layer, position: Point, solid: boolean) {
        activateLayer(layer);
        const result = new Path.Circle(position, 5);
        result.strokeColor = new Color("#1d94a4");
        result.fillColor = new Color("#1d94a4"); // a distinct instance of Color, may get made transparent below
        result.strokeWidth = 1;
        if (!solid) {
            Tail.makeTransparentClickable(result);
        }
        result.name = "handle" + Handle.handleIndex++;
        result.visible = true;
        result.data = this;
        this.handle = result;
    }

    getPosition(): Point {
        return this.handle.position!;
    }
    setPosition(p: Point) {
        this.handle.position = p;
    }

    onDrag: (p: Point) => void;
    onDoubleClick: () => void;
}
