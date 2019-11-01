import { Tail } from "./tail";
import { Point, Layer, Path, Color } from "paper";
import { TailSpec } from "bubbleSpec";
import { Bubble } from "bubble";

export class LineTail extends Tail {
    private tailWidth: number = 1;

    public constructor(
        root: Point,
        tip: Point,
        lowerLayer: Layer,
        upperLayer: Layer,
        handleLayer: Layer,
        spec: TailSpec,
        bubble: Bubble | undefined
    ) {
        super(root, tip, lowerLayer, upperLayer, handleLayer, spec, bubble);
    }

    public makeShapes() {
        const oldStroke = this.pathstroke;
        this.lowerLayer.activate();

        this.tailWidth = 1; // Single pixel may not be thick enough to see it on an image

        this.pathstroke = new Path.Line(this.root, this.tip);

        if (oldStroke) {
            this.pathstroke.insertBelow(oldStroke);
            oldStroke.remove();
        }

        this.pathstroke.strokeColor = new Color("black");
        this.pathstroke.strokeWidth = this.tailWidth;
    }

    public onClick(action: () => void) {
        this.clickAction = action;
        if (this.pathstroke) {
            // create onMouseEnter and onMouseLeave events for making it easier for a user to grab
            // the tail. Otherwise clicking on it is really hard. The onMouseLeave event is so that it
            // returns the tail to the default width (this.tailWidth) of the LineTail

            this.pathstroke.onMouseEnter = () => {
                this.pathstroke.strokeWidth = 4;
            };

            this.pathstroke.onMouseLeave = () => {
                this.pathstroke.strokeWidth = this.tailWidth;
            };
            this.pathstroke.onClick = action;
        }
    }
}
