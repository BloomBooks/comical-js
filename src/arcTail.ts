import { Point, Layer, Path, Color, Segment } from "paper";
import { TailSpec } from "./bubbleSpec";
import { Bubble } from "./bubble";
import { activateLayer } from "./utilities";
import { CurveTail } from "./curveTail";
import { Comical } from "./comical";

// An ArcTail is currently our default: a tail that is an arc from the tip through a third
// control point, mid, which can also be dragged.
export class ArcTail extends CurveTail {
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
        console.assert(!!this.bubble, "ArcTail::makeShapes() - this.bubble is null or undefined");
        const oldFill = this.pathFill;
        const oldStroke = this.pathstroke;

        activateLayer(this.lowerLayer);

        const tailWidth = 18; // width of tail when measured at center of bubble
        const baseAlongPathLength = 20; // and when measured along the circumference of speech bubble

        // We want to make two bezier curves, basically from the tip to a bit either side
        // of the root, and passing near mid.
        // It's a bit nontrivial to get these to look good. The standard is higher for
        // speech bubbles, which are by far the most common.

        // First we want to find a starting point for the tail. In general this is
        // the center of the content box.
        let baseOfTail = this.root;
        const doingSpeechBubble = this.bubble && this.bubble.getFullSpec().style === "speech";
        if (doingSpeechBubble) {
            // We're going to make the base of the tail a point on the bubble itself,
            // from which we will eventually calculate a fixed distance along the
            // circumfererence to get the actual start and end points for the tail.
            // To find this point, we use the same method as we will eventually use
            // for the sides of the tail itself to make a curve from the root
            // through mid to the tip. Then we see where this intersects the bubble.
            const rootTipCurve = this.makeBezier(this.root, this.mid, this.tip);
            rootTipCurve.remove(); // don't want to see this, it's just for calculations.
            const bubblePath = this.bubble!.outline as Path; // speech bubble outline always is a Path
            const intersections = rootTipCurve.getIntersections(bubblePath);
            // in the pathological case where there's more than one intersection,
            // choose the one closest to the root. We're going to get a bizarre
            // tail that loops out of the bubble and back through it anyway,
            // so better to have it start at the natural place.
            intersections.sort((a, b) => a.curveOffset - b.curveOffset);
            baseOfTail = intersections[0].point;
        }

        const angleBaseTip = this.tip.subtract(baseOfTail).angle!;
        // This is a starting point for figuring out how wide the tail should be
        // at its midpoint. Various things adjust it.
        let midPointWidth = tailWidth / 2; // default for non-speech
        // make an extra curve where the short side of the tail meets the bubble.
        // Only applies to speech, but used in a couple of places.
        let hookShortLeg = false;

        // Figure out where the tail starts and ends...the 'base' of the 'triangle'.
        let begin: Point; // where the tail path starts
        let end: Point; // where it ends
        if (doingSpeechBubble) {
            // we want to move along the bubble curve a specified distance
            const bubblePath = this.bubble!.outline as Path;
            const offset = bubblePath.getOffsetOf(baseOfTail);
            let offsetBegin = offset + baseAlongPathLength / 2;
            if (offsetBegin > bubblePath.length) {
                offsetBegin -= bubblePath.length;
            }
            // nudge it towards the center to make sure we don't get even a hint
            // of the bubble's border that it's not on top of.
            begin = this.nudgeTowards(bubblePath.getLocationAt(offsetBegin).point, this.root);
            let offsetEnd = offset - baseAlongPathLength / 2;
            if (offsetEnd < 0) {
                offsetEnd += bubblePath.length;
            }
            end = this.nudgeTowards(bubblePath.getLocationAt(offsetEnd).point, this.root);

            // Experimentally, the hook curve becomes an ugly point at very small sizes.
            // In those cases we dont do it. When we DO do it, we need to make the tail
            // quite a bit narrower so it doesn't bulge out again after the hook curve.
            // If we're not doing a hook curve, the 0.4 seems to look good.
            const baseToMid = this.mid.subtract(baseOfTail);
            hookShortLeg = baseToMid.length! > baseAlongPathLength * 0.5;
            midPointWidth = baseAlongPathLength * (hookShortLeg ? 0.25 : 0.4);
        } else {
            // For most bubble shapes, we want to make the base of the tail a line of length tailWidth
            // at right angles to the line from root to mid centered at root.
            const angleBase = new Point(this.mid.x! - this.root.x!, this.mid.y! - this.root.y!).angle!;
            const deltaBase = new Point(0, 0);
            deltaBase.angle = angleBase + 90;
            deltaBase.length = tailWidth / 2;
            begin = this.root.add(deltaBase);
            end = this.root.subtract(deltaBase);
        }

        // Now we need the other two points that define the beziers: the
        // ones close to the 'mid' point that the user controls.
        // We're going to start at mid and go in a direction at right
        // angles to the original line from base to tip.
        // To give the tail a rougly evenly reducing width, we make the
        // actual distance either side of mid depend on how far along the
        // original curve mid is.
        const midPath = this.makeBezier(baseOfTail, this.mid, this.tip);
        midPath.remove(); // don't want to see this, it's just for calculations.
        const midWidthRatio = midPath.curves[1].length / midPath.length;
        const deltaMid = new Point(0, 0);
        deltaMid.angle = angleBaseTip + 90;
        deltaMid.length = midPointWidth * midWidthRatio;
        const mid1 = this.mid.add(deltaMid);
        const mid2 = this.mid.subtract(deltaMid);

        // Now we can make the actual path, initially in two pieces.
        this.pathstroke = this.makeBezier(begin, mid1, this.tip);
        const bezier2 = this.makeBezier(this.tip, mid2, end);

        if (hookShortLeg) {
            // round the corner where it leaves the main bubble.
            let hookHandleLength = midPointWidth * 2.5;
            const baseToMid = baseOfTail.subtract(this.mid);
            if (Math.abs(baseToMid.x!) > Math.abs(baseToMid.y!)) {
                hookHandleLength *= Math.abs(baseToMid.y! / baseToMid.x!);
            } else {
                hookHandleLength *= Math.abs(baseToMid.x! / baseToMid.y!);
            }

            // Depending on which way the tail initially curves, the hook
            // may go at the begin or end point.
            if (baseToMid!.x! * baseToMid!.y! > 0) {
                const endHandle = this.tip.subtract(end);
                endHandle.angle! += 90;
                endHandle.length = hookHandleLength;
                bezier2.segments![2].handleIn = endHandle;
            } else {
                const beginHandle = this.tip.subtract(begin);
                beginHandle.angle! -= 90;
                beginHandle.length = hookHandleLength;
                this.pathstroke.segments![0].handleOut = beginHandle;
            }
        }
        // Merge the into a single path.
        this.pathstroke.addSegments(bezier2.segments!);
        bezier2.remove();

        if (oldStroke) {
            this.pathstroke.insertBelow(oldStroke);
            oldStroke.remove();
        }

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
        this.pathFill.strokeColor = new Color("white");
        this.pathFill.strokeColor.alpha = 0.01;
        if (this.clickAction) {
            Comical.setItemOnClick(this.pathFill, this.clickAction);
        }
    }

    // Move the start point a single pixel towards the target point.
    nudgeTowards(start: Point, target: Point): Point {
        const delta = target.subtract(start);
        delta.length = 1;
        return start.add(delta);
    }

    // Make a particular kind of bezier curve that produces better shapes
    // than an arc through the three points. One side of the tail is made
    // of one of these starting on the border of the bubble and passing near the
    // middle control point and ending at the tip; the other side goes in
    // the opposite direction, so it's imporant for the algorithm to
    // be symmetrical.
    makeBezier(start: Point, mid: Point, end: Point): Path {
        const result = new Path();
        result.add(new Segment(start));
        const baseToTip = end.subtract(start);
        const handleDeltaIn = baseToTip.multiply(0.3);
        const handleDeltaOut = handleDeltaIn;
        handleDeltaIn.length = Math.min(handleDeltaIn.length!, mid.subtract(start).length! / 2);
        handleDeltaOut.length = Math.min(handleDeltaOut.length!, end.subtract(mid).length! / 2);
        result.add(new Segment(mid, new Point(0, 0).subtract(handleDeltaIn), handleDeltaOut));
        result.add(new Segment(end));
        // Uncomment to see all the handles. Very useful for debugging.
        //result.fullySelected = true;
        return result;
    }
}
