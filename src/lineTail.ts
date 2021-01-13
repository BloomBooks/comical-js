import { Tail } from "./tail";
import paper = require("paper");
import { TailSpec } from "./bubbleSpec";
import { Bubble } from "./bubble";
import { Comical } from "./comical";

export class LineTail extends Tail {
    private tailWidth: number = 1;

    public constructor(
        root: paper.Point,
        tip: paper.Point,
        lowerLayer: paper.Layer,
        upperLayer: paper.Layer,
        handleLayer: paper.Layer,
        spec: TailSpec,
        bubble: Bubble | undefined
    ) {
        super(root, tip, lowerLayer, upperLayer, handleLayer, spec, bubble);
    }

    public canUnite() {
        return false;
    }

    public makeShapes() {
        const oldStroke = this.pathstroke;
        this.lowerLayer.activate();

        this.pathstroke = this.makeShape(this.root);

        if (oldStroke) {
            this.pathstroke.insertBelow(oldStroke);
            oldStroke.remove();
        }
    }

    public makeShape(from: paper.Point): paper.Path {
        const result = new paper.Path.Line(from, this.tip);
        result.strokeColor = new paper.Color("black");
        result.strokeWidth = this.tailWidth;
        return result;
    }

    public onClick(action: () => void) {
        this.clickAction = action;
        if (this.pathstroke) {
            // create onMouseEnter and onMouseLeave events for making it easier for a user to grab
            // the tail. Otherwise clicking on it is really hard. The onMouseLeave event is so that it
            // returns the tail to the default width (this.tailWidth) of the LineTail

            // Enhance: If we still want this behavior, we have to enhance it to cope with scale
            // this.pathstroke.onMouseEnter = () => {
            //     this.pathstroke.strokeWidth = 4;
            // };

            // this.pathstroke.onMouseLeave = () => {
            //     this.pathstroke.strokeWidth = this.tailWidth;
            // };
            Comical.setItemOnClick(this.pathstroke, action);
        }
    }
}
