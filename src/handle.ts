import { Point, Path, Layer } from "paper";
import { activateLayer } from "./utilities";
import { Tail } from "./tail";
import { Comical } from "./comical";

// This class represents one of the handles used to manipulate tails.
export class Handle {
    private circle: Path.Circle;

    // Helps determine unique names for the handles
    static handleIndex = 0;

    constructor(layer: Layer, position: Point, autoMode: boolean) {
        activateLayer(layer);
        this.circle = new Path.Circle(position, 5);
        this.circle.strokeColor = Comical.tailHandleColor;
        this.circle.strokeWidth = 1;
        this.circle.name = "handle" + Handle.handleIndex++;
        this.circle.visible = true;
        this.circle.data = this;
        this.setAutoMode(autoMode);
    }

    setAutoMode(autoMode: boolean) {
        this.circle.fillColor = autoMode ? Tail.transparentColor : Comical.tailHandleColor;
    }

    getPosition(): Point {
        return this.circle.position!;
    }
    setPosition(p: Point) {
        this.circle.position = p;
    }
    setVisibility(visibility: boolean) {
        this.circle.visible = visibility;
    }
    bringToFront() {
        this.circle.bringToFront();
    }

    onDrag: (p: Point) => void;
    onDoubleClick: () => void;
}
