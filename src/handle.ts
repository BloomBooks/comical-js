import paper = require("paper");
import { activateLayer } from "./utilities";
import { Tail } from "./tail";
import { Comical } from "./comical";

// This class represents one of the handles used to manipulate tails.
export class Handle {
    private circle: paper.Path.Circle;

    // Helps determine unique names for the handles
    static handleIndex = 0;

    constructor(layer: paper.Layer, position: paper.Point, autoMode: boolean) {
        activateLayer(layer);
        this.circle = new paper.Path.Circle(position, 5);
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

    getPosition(): paper.Point {
        return this.circle.position!;
    }
    setPosition(p: paper.Point) {
        this.circle.position = p;
    }
    setVisibility(visibility: boolean) {
        this.circle.visible = visibility;
    }
    bringToFront() {
        this.circle.bringToFront();
    }

    onDrag: (p: paper.Point) => void;
    onDoubleClick: () => void;
}
