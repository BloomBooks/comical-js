import paper = require("paper");
import { TailSpec } from "./bubbleSpec";
import { Bubble } from "./bubble";
import { activateLayer } from "./utilities";
import { CurveTail } from "./curveTail";
import { Comical } from "./comical";

// An ArcTail is currently our default: a tail that is an arc from the tip through a third
// control point, mid, which can also be dragged.
export class ArcTail extends CurveTail {
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
        let doingSpeechBubble = this.bubble && this.bubble.getFullSpec().style === "speech";
        if (doingSpeechBubble) {
            // We're going to make the base of the tail a point on the bubble itself,
            // from which we will eventually calculate a fixed distance along the
            // circumfererence to get the actual start and end points for the tail.
            // To find this point, we use the same method as we will eventually use
            // for the sides of the tail itself to make a curve from the root
            // through mid to the tip. Then we see where this intersects the bubble.
            const rootTipCurve = this.makeBezier(this.root, this.mid, this.tip);
            rootTipCurve.remove(); // don't want to see this, it's just for calculations.
            const bubblePath = this.getBubblePath();
            if (bubblePath instanceof paper.Path) {
                const intersections = rootTipCurve.getIntersections(bubblePath);
                if (intersections.length === 0) {
                    // This is very pathological and could only happen if the tip and mid are
                    // both inside the bubble. In that case any tail will be inside the bubble
                    // and invisible anyway, so we may as well just give up and not make any shapes.
                    return;
                }
                // in the pathological case where there's more than one intersection,
                // choose the one closest to the root. We're going to get a bizarre
                // tail that loops out of the bubble and back through it anyway,
                // so better to have it start at the natural place.
                intersections.sort((a, b) => a.curveOffset - b.curveOffset);
                baseOfTail = intersections[0].point;
            } else {
                console.assert(false, "speech bubble outline should be a path or a group with second element path");
                doingSpeechBubble = false; // fall back to default mode.
            }
        }

        const angleBaseTip = this.tip.subtract(baseOfTail).angle!;
        // This is a starting point for figuring out how wide the tail should be
        // at its midpoint. Various things adjust it.
        let midPointWidth = tailWidth / 2; // default for non-speech
        // make an extra curve where the short side of the tail meets the bubble.
        // Only applies to speech, but used in a couple of places.
        let puckerShortLeg = false;

        // Figure out where the tail starts and ends...the 'base' of the 'triangle'.
        let begin: paper.Point; // where the tail path starts
        let end: paper.Point; // where it ends
        if (doingSpeechBubble) {
            // we want to move along the bubble curve a specified distance
            const bubblePath = this.getBubblePath();
            const offset = bubblePath.getOffsetOf(baseOfTail);
            const offsetBegin = (offset + baseAlongPathLength / 2) % bubblePath.length;
            // nudge it towards the center to make sure we don't get even a hint
            // of the bubble's border that it's not on top of.
            begin = this.nudgeTowards(bubblePath.getLocationAt(offsetBegin).point, this.root);
            let offsetEnd = offset - baseAlongPathLength / 2;
            if (offsetEnd < 0) {
                // % will leave it negative
                offsetEnd += bubblePath.length;
            }
            end = this.nudgeTowards(bubblePath.getLocationAt(offsetEnd).point, this.root);

            // At one point we found that the pucker curve became an ugly angle at very small sizes.
            // In those cases we don't do it. When we DO do it, we need to make the tail
            // a bit narrower so it doesn't bulge out again after the pucker curve.
            // If we're not doing a pucker curve, the 0.3 seems to look good.
            const baseToMid = this.mid.subtract(baseOfTail);
            puckerShortLeg = baseToMid.length! > baseAlongPathLength * 0.5;
            midPointWidth = baseAlongPathLength * (puckerShortLeg ? 0.25 : 0.3);
        } else {
            // For most bubble shapes, we want to make the base of the tail a line of length tailWidth
            // at right angles to the line from root to mid centered at root.
            const angleBase = this.mid.subtract(this.root).angle!;
            const deltaBase = new paper.Point(0, 0);
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
        const deltaMid = new paper.Point(0, 0);
        deltaMid.angle = angleBaseTip + 90;
        deltaMid.length = midPointWidth * midWidthRatio;
        const mid1 = this.mid.add(deltaMid);
        const mid2 = this.mid.subtract(deltaMid);
        // In theory, we'd like the two beziers to come together at a perfectly sharp point.
        // But in practice, some browsers (at least, Chrome and things using that engine)
        // sometimes draw the narrowing border out well beyond where the tip point is supposed
        // to be. If we 'square off' the tip by even a very tiny amount, this behavior is
        // prevented. So the two beziers have 'tips' just slightly different.
        // See BL-8331, BL-8332.
        const deltaTip = deltaMid.divide(1000);

        // Now we can make the actual path, initially in two pieces.
        // Non-joiner tails (e.g. bubbles w/o a child) use a tapering algorithm where the root is wider and it narrows down to a tip.
        // Joiners (i.e. connectors between parent and child bubbles) use a different algo with a steady width.
        let bezier2: paper.Path;
        if (this.spec.joiner !== true) {
            // Normal tapering
            this.pathstroke = this.makeBezier(begin, mid1, this.tip.add(deltaTip));
            bezier2 = this.makeBezier(this.tip.subtract(deltaTip), mid2, end);
        } else {
            // No tapering for child connectors (See BL-9082)
            // At both the root and tip, it maintains width same as width at the mid.
            this.pathstroke = this.makeBezier(this.root.add(deltaMid), mid1, this.tip.add(deltaMid));
            bezier2 = this.makeBezier(this.tip.subtract(deltaMid), mid2, this.root.subtract(deltaMid));
        }

        // For now we decided to always do the pucker (except for child connectors)...the current algorithm seems
        // to have cleared up the sharp angle problem. Keeping the option to turn
        // it off in case we change our minds.
        if (this.spec.joiner !== true /* puckerShortLeg */) {
            // round the corner where it leaves the main bubble.
            let puckerHandleLength = baseAlongPathLength * 0.8; // experimentally determined

            const baseToMid = this.mid.subtract(baseOfTail);
            const midToTip = this.tip.subtract(this.mid);
            const midAngle = baseToMid.angle!;
            const tipAngle = midToTip.angle!;
            let deltaAngle = midAngle - tipAngle;
            // which way the tip bends from the midpoint.
            let clockwise = Math.sin((deltaAngle * Math.PI) / 180) < 0;
            // We don't want any pucker when the angle is zero; for one thing, it would jump
            // suddenly from one side to the other as we go through zero.
            // But we want it to rise rather rapidly as we get away from zero; our default
            // curve is not very much even at 45 degrees. The sin function does this rather well.
            // the multiplier is about as much as we can use without the tail having a bulge.
            // Likewise in the interests of avoiding a bulge, we need to give it a max length.
            puckerHandleLength *= Math.min(Math.abs(Math.sin((deltaAngle * Math.PI) / 180)) * 1.8, 1);

            // Depending on which way the tail initially curves, the pucker
            // may go at the begin or end point.
            // Enhance: at very mid-point distances, the handle may end up pointing into the interior
            // of the bubble. We think it might look better to prevent it being rotated past the
            // angle that is straight towards the other point. Haven't had time to actually try this.
            if (clockwise) {
                const beginHandle = mid1.subtract(begin);
                beginHandle.angle! -= 70;
                beginHandle.length = puckerHandleLength;
                this.pathstroke.segments![0].handleOut = beginHandle;
            } else {
                const endHandle = mid2.subtract(end);
                endHandle.angle! += 70;
                endHandle.length = puckerHandleLength;
                bezier2.segments![2].handleIn = endHandle;
            }
        }
        // Merge the two parts into a single path (so we only have one to
        // keep track of, but more importantly, so we can clone a filled shape
        // from it).
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
        this.pathFill = this.pathstroke.clone() as paper.Path;
        this.pathFill.remove();
        if (oldFill) {
            this.pathFill.insertBelow(oldFill);
            oldFill.remove();
        } else {
            this.upperLayer.addChild(this.pathFill);
        }
        this.pathstroke.strokeColor = new paper.Color("black");
        this.pathFill.fillColor = this.getFillColor();
        this.pathFill.strokeColor = new paper.Color("white");
        this.pathFill.strokeColor.alpha = 0.01;
        if (this.clickAction) {
            Comical.setItemOnClick(this.pathFill, this.clickAction);
        }
    }

    getBubblePath(): paper.Path {
        let bubblePath = this.bubble!.outline as paper.Path;
        if (!(bubblePath instanceof paper.Path)) {
            // We make a group when drawing the outer outline.
            let group = this.bubble!.outline as paper.Group;
            bubblePath = group.children![1] as paper.Path;
        }
        return bubblePath;
    }

    // Move the start point a single pixel towards the target point.
    nudgeTowards(start: paper.Point, target: paper.Point): paper.Point {
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
    makeBezier(start: paper.Point, mid: paper.Point, end: paper.Point): paper.Path {
        const result = new paper.Path();
        result.add(new paper.Segment(start));
        const baseToTip = end.subtract(start);
        // This makes the handles parallel to the line from start to end.
        // This seems to be a good default for a wide range of positions,
        // though eventually we may want to allow the user to drag them.
        const handleDeltaIn = baseToTip.multiply(0.3);
        const handleDeltaOut = baseToTip.multiply(0.3);
        handleDeltaIn.length = Math.min(handleDeltaIn.length!, mid.subtract(start).length! / 2);
        handleDeltaOut.length = Math.min(handleDeltaOut.length!, end.subtract(mid).length! / 2);
        result.add(new paper.Segment(mid, new paper.Point(0, 0).subtract(handleDeltaIn), handleDeltaOut));
        result.add(new paper.Segment(end));
        // Uncomment to see all the handles. Very useful for debugging.
        //result.fullySelected = true;
        return result;
    }
}
