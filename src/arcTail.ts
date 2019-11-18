import { Point, Layer, Path, Color } from "paper";
import { TailSpec } from "./bubbleSpec";
import { Bubble } from "./bubble";
import { activateLayer, makeArc } from "./utilities";
import { CurveTail } from "./curveTail";
import { Comical } from "./comical";

// An ArcTail is currently our default: a tail that is an arc from the tip through a third
// control point, mid, which can also be dragged.
export class ArcTail extends CurveTail {
    mark1: Path.Circle | undefined;
    mark2: Path.Circle | undefined;

    public constructor(
        root: Point,
        tip: Point,
        mid: Point,
        lowerLayer: Layer,
        upperLayer: Layer,
        handleLayer: Layer,
        spec: TailSpec,
        bubble: Bubble | undefined
    ) {
        super(root, tip, lowerLayer, upperLayer, handleLayer, spec, bubble);
        this.mid = mid;
    }

    // Make the shapes that implement the tail.
    // If there are existing shapes (typically representing an earlier tail position),
    // remove them after putting the new shapes in the same z-order and layer.
    public makeShapes() {
        const oldFill = this.pathFill;
        const oldStroke = this.pathstroke;

        activateLayer(this.lowerLayer);

        const tailWidth = 18;

        // We want to make two arcs, basically from the tip to a bit either side
        // of the root, and passing through mid.
        // It's a bit nontrivial to get these to look good. We want the thickness
        // to NOT depend on how close the mid-point is to either end, and definitely
        // don't want the arcs to cross.
        // The best thing I've come up with is to start with an arc through the three
        // points. Then make a line that bisects the tip/root line, and find where
        // the arc intersects it. Then we move along the bisector a quarter of the base tailWidth
        // in either direction. This gives us two points which define the middle of each arc.
        // The two points near the root are made by going a half base-width in either
        // direction along a line perpendicular to the line from the root to the
        // control point.

        const midPointRootTip = new Point((this.tip.x! + this.root.x!) / 2, (this.tip.y! + this.root.y!) / 2);
        const angleRootTip = new Point(this.tip.x! - this.root.x!, this.tip.y! - this.root.y!).angle!;

        // make the perpendicular bisector. Note that these deltas are not really
        // points relative to any particular origin; rather, they function as vectors
        // to add and subtract from other points.
        const deltaMidLine = new Point(0, 0);
        deltaMidLine.angle = angleRootTip + 90;
        deltaMidLine.length = 1000000;
        const bisectorStart = midPointRootTip.add(deltaMidLine);
        const bisectorEnd = midPointRootTip.subtract(deltaMidLine);
        const tempBisector = new Path.Line(bisectorStart, bisectorEnd);

        // find where it intersects an arc through the three original control points.
        const tempArc = makeArc(this.root, this.mid, this.tip);
        const intersect = tempArc.getIntersections(tempBisector);
        tempArc.remove(); // maybe we could prevent adding them in the first place?
        tempBisector.remove();

        // Typically we will have exactly one intersection. In a really bizarre
        // positioning of mid on the wrong side of root or tip, we may not get
        // one...maybe it's more than 1000000px out? Anyway using an unmodified
        // mid lets us do something, though it's likely to be weird. Maybe eventually
        // we can constrain the movement of the control point enough to prevent this?
        // For example, perhaps it can't be further from either end-point than
        // the distance they are apart? or can't pass a line through either end-point
        // perpendicular to the line to the other end point?
        const adjustedMid = intersect.length ? intersect[0].point : this.mid;

        // we want to make the base of the tail a line of length tailWidth
        // at right angles to the line from root to adjustedMid
        // centered at root.
        const angleBase = new Point(adjustedMid.x! - this.root.x!, adjustedMid.y! - this.root.y!).angle!;
        const deltaBase = new Point(0, 0);
        deltaBase.angle = angleBase + 90;
        deltaBase.length = tailWidth / 2;
        const begin = this.root.add(deltaBase);
        const end = this.root.subtract(deltaBase);

        // The midpoints of the arcs are a quarter base width either side of adjustedMid,
        // offset at right angles to the root/tip line.
        const angleMid = angleRootTip;
        const deltaMid = new Point(0, 0);
        deltaMid.angle = angleMid + 90;
        deltaMid.length = tailWidth / 4;
        const mid1 = adjustedMid.add(deltaMid);
        const mid2 = adjustedMid.subtract(deltaMid);
        if (this.debugMode) {
            if (this.mark1) {
                this.mark1.remove();
                this.mark2!.remove();
            }
            activateLayer(this.upperLayer);
            this.mark1 = new Path.Circle(mid1, 3);
            this.mark1.fillColor = this.mark1.strokeColor = new Color("red");
            this.mark2 = new Path.Circle(mid2, 3);
            this.mark2.fillColor = this.mark2.strokeColor = new Color("red");
            activateLayer(this.lowerLayer);
        }

        this.pathstroke = makeArc(begin, mid1, this.tip);
        const pathArc2 = makeArc(this.tip, mid2, end);
        this.pathstroke.addSegments(pathArc2.segments!);
        pathArc2.remove();
        if (oldStroke) {
            this.pathstroke.insertBelow(oldStroke);
            oldStroke.remove();
        }

        console.assert(!!this.bubble, "ArcTail::makeShapes() - this.bubble is null or undefined");
        let borderWidth = 1;
        if (this.bubble) {
            borderWidth = this.bubble.getBorderWidth();
        }

        this.pathstroke!.strokeWidth = borderWidth;
        activateLayer(this.upperLayer);
        this.pathFill = this.pathstroke.clone() as Path;
        this.pathFill.remove();
        if (oldFill) {
            this.pathFill.insertBelow(oldFill);
            oldFill.remove();
        } else {
            this.upperLayer.addChild(this.pathFill);
        }
        this.pathstroke.strokeColor = new Color("black");
        this.pathFill.fillColor = this.getFillColor();
        if (this.clickAction) {
            Comical.setItemOnClick(this.pathFill, this.clickAction);
        }
    }
}
