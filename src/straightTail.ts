import { Tail } from "./tail";
import paper = require("paper");
import { TailSpec } from "./bubbleSpec";
import { Bubble } from "./bubble";
import { activateLayer } from "./utilities";
import { Comical } from "./comical";

//  straight tail is a simple triangle, with only the tip handle
export class StraightTail extends Tail {
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

    // Make the shapes that implement the tail.
    // If there are existing shapes (typically representing an earlier tail position),
    // remove them after putting the new shapes in the same z-order and layer.
    public makeShapes() {
        const oldFill = this.pathFill;
        const oldStroke = this.pathstroke;

        activateLayer(this.lowerLayer);

        const tailWidth = 12;

        // We want to make two lines from the tip to a bit either side
        // of the root.

        // we want to make the base of the tail a line of length tailWidth
        // at right angles to the line from root to tip
        // centered at root.
        const angleBase = new paper.Point(this.tip.x - this.root.x, this.tip.y - this.root.y).angle;
        const deltaBase = new paper.Point(0, 0);
        deltaBase.angle = angleBase + 90;
        deltaBase.length = tailWidth / 2;
        const begin = this.root.add(deltaBase);
        const end = this.root.subtract(deltaBase);

        this.pathstroke = new paper.Path.Line(begin, this.tip);
        const pathLine2 = new paper.Path.Line(this.tip, end);
        this.pathstroke.addSegments(pathLine2.segments);
        pathLine2.remove();
        if (oldStroke) {
            this.pathstroke.insertBelow(oldStroke);
            oldStroke.remove();
        }
        this.pathstroke!.strokeWidth = this.bubble!.getBorderWidth();
        activateLayer(this.upperLayer);
        this.pathFill = this.pathstroke.clone({ insert: false }) as paper.Path;
        if (oldFill) {
            this.pathFill.insertAbove(oldFill);
            oldFill.remove();
        } else {
            this.upperLayer.addChild(this.pathFill);
        }
        this.pathstroke.strokeColor = new paper.Color("black");
        this.pathFill.fillColor = this.getFillColor();
        if (this.clickAction) {
            Comical.setItemOnClick(this.pathFill, this.clickAction);
        }
    }
}
