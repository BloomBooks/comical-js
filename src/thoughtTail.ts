import paper = require("paper");
import { TailSpec } from "bubbleSpec";
import { Bubble } from "./bubble";
import { activateLayer, makeArc } from "./utilities";
import { CurveTail } from "./curveTail";
import { Comical } from "./comical";

// A ThoughtTail is a succession of mini-bubbles, ellipses drawn along the curve.
// One of them may partly overlap the main bubble.
// Enhance: all the handle-related code could usefully be refactored into a
// common base class shared by ArcTail, perhaps MidHandleTail
export class ThoughtTail extends CurveTail {
    mark1: paper.Path.Circle | undefined;
    mark2: paper.Path.Circle | undefined;

    miniBubbleStrokePaths: paper.Path[];
    miniBubbleFillPaths: paper.Path[];

    public constructor(
        root: paper.Point,
        tip: paper.Point,
        mid: paper.Point,
        lowerLayer: paper.Layer,
        upperLayer: paper.Layer,
        handleLayer: paper.Layer,
        spec: TailSpec,
        bubble: Bubble | undefined
    ) {
        super(root, tip, lowerLayer, upperLayer, handleLayer, spec, bubble);
        this.mid = mid;
    }

    // Make the shapes that implement the tail.
    // If there are existing shapes (typically representing an earlier tail position),
    // remove them.
    public makeShapes() {
        if (this.miniBubbleFillPaths) {
            this.miniBubbleFillPaths.forEach(x => x.remove());
        }
        if (this.miniBubbleStrokePaths) {
            this.miniBubbleStrokePaths.forEach(x => x.remove());
        }

        const rootWidth = 20;
        const tipWidth = 7;

        // We want to make an arc from the tip to the root, and passing through mid.
        const centerPath = makeArc(this.tip, this.mid, this.root);
        centerPath.remove();

        const length = centerPath.length;

        let bubbleSep = 3;
        this.miniBubbleFillPaths = [];
        this.miniBubbleStrokePaths = [];
        // bubbleRim is roughly the distance from the tip where
        // the closer rim of the next mini-bubble will go.
        // It advances along the centerPath as the main loop iterates.
        let bubbleRim = bubbleSep;

        // Uncomment the three lastPoint lines to make the ellipses
        // align along the curve.
        //let lastPoint = this.tip;

        // Unusually, all thought-bubble tail shapes are drawn in the upper layer.
        // This allows one mini-bubble to overlap the main bubble and still be
        // drawn completely. It also means that a mini-bubble can be drawn on top
        // of some other bubble in the same layer, but that should be vanishingly rare.
        activateLayer(this.upperLayer);

        while (bubbleRim < length) {
            // Normal tails: bubble Radius grows from tipWidth to rootWidth along the path.
            // Joiner tails: Use a steady width along the entire path (See BL-9082).
            const bubbleRadius =
                this.spec.joiner !== true
                    ? ((rootWidth - tipWidth) * bubbleRim) / length + tipWidth
                    : (rootWidth + tipWidth) / 2;
            const bubbleCenter = bubbleRim + bubbleRadius;
            if (bubbleCenter >= length) {
                break; // We can't compute center!
            }
            const center = centerPath.getLocationAt(bubbleCenter).point;
            // This is a point roughly half way between the center and rim of the
            // mini-bubble along the arc. If that's inside the main bubble, we stop.
            // The effect is that up to about 3/4 of a mini-bubble can overlap the
            // main bubble. We must stop there, because the mini-bubbles are drawn
            // on top of the main bubble, and ones inside the text would be wrong.
            // This is the usual exit from this loop.
            const testPoint = center.add(centerPath.getLocationAt(bubbleRim).point).divide(2);
            if (this.bubble!.isHitByPoint(testPoint)) {
                break;
            }
            const newStroke = new paper.Path.Ellipse({
                center: center,
                size: new paper.Size(bubbleRadius + 5, bubbleRadius)
            });
            // Anything with a matching fill element needs doubled border
            // because it grows both ways from the ideal line, and the inner
            // half is covered by the fill.
            newStroke.strokeWidth = this.bubble!.getBorderWidth() * 2;
            newStroke.strokeColor = new paper.Color("black");
            //newStroke.rotation = center.subtract(lastPoint).angle;
            this.miniBubbleStrokePaths.push(newStroke);
            const newFill = newStroke.clone() as paper.Path;
            newFill.fillColor = this.getFillColor();
            // Any border on the fill area just confuses things.
            newFill.strokeWidth = 0;

            if (this.clickAction) {
                Comical.setItemOnClick(newFill, this.clickAction);
            }

            this.miniBubbleFillPaths.push(newFill);

            // prepare for next iteration
            bubbleSep += 2;
            bubbleRim += bubbleRadius * 2 + bubbleSep;
            //lastPoint = center;
        }
    }

    public fillPaths(): paper.Path[] {
        return this.miniBubbleFillPaths || [];
    }

    public allPaths(): paper.Path[] {
        let result = this.fillPaths();
        if (this.miniBubbleStrokePaths) {
            result = [...result, ...this.miniBubbleStrokePaths];
        }
        return result;
    }
}
