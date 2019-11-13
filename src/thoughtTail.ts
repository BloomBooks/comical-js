import { Tail } from "./tail";
import { Point, Layer, Path, ToolEvent, Color, Size } from "paper";
import { TailSpec } from "bubbleSpec";
import { Bubble } from "./bubble";
import { activateLayer } from "./utilities";
import { Comical } from "./comical";

// An ThoughtTail is a succession of mini-bubbles, ellipses drawn along the curve.
// One of them may partly overlap the main bubble.
// Enhance: all the handle-related code could usefully be refactored into a
// common base class shared by ArcTail, perhaps MidHandleTail
export class ThoughtTail extends Tail {
    mid: Point;

    mark1: Path.Circle | undefined;
    mark2: Path.Circle | undefined;

    // This may be set to ensure that when the tail's midpoint is moved
    // automatically (e.g., to adjust for the root moving), the corresponding
    // handle is moved too.
    midHandle: Path | undefined;

    miniBubbleStrokePaths: Path[];
    miniBubbleFillPaths: Path[];

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

    // Enhance: wants to move to utilities.
    private static makeArc(start: Point, mid: Point, end: Point): Path {
        try {
            return new Path.Arc(start, mid, end);
        } catch (e) {
            // Path.Arc fails when the points are on a straight line.
            // In that case, just return the line.
            return new Path.Line(start, end);
        }
    }

    // Make the shapes that implement the tail.
    // If there are existing shapes (typically representing an earlier tail position),
    // remove them after putting the new shapes in the same z-order and layer.
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
        const centerPath = ThoughtTail.makeArc(this.tip, this.mid, this.root);
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
            // bubble Radius grows from tipWidth to rootWidth along the path.
            const bubbleRadius = ((rootWidth - tipWidth) * bubbleRim) / length + tipWidth;
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
            const newStroke = new Path.Ellipse({ center: center, size: new Size(bubbleRadius + 5, bubbleRadius) });
            newStroke.strokeWidth = this.bubble!.getBorderWidth();
            newStroke.strokeColor = new Color("black");
            //newStroke.rotation = center.subtract(lastPoint).angle!;
            this.miniBubbleStrokePaths.push(newStroke);
            const newFill = newStroke.clone() as Path;
            newFill.fillColor = this.getFillColor();
            // The idea here is to let the full width of pathStroke's border
            // show through. It doesn't quite work but gives a result consistent
            // with other similar fill paths.
            newFill.strokeColor = new Color("white");
            newFill.strokeColor.alpha = 0;

            if (this.clickAction) {
                newFill.onClick = this.clickAction;
            }

            this.miniBubbleFillPaths.push(newFill);

            // prepare for next iteration
            bubbleSep += 2;
            bubbleRim += bubbleRadius * 2 + bubbleSep;
            //lastPoint = center;
        }
    }

    public fillPaths(): Path[] {
        return this.miniBubbleFillPaths || [];
    }

    public allPaths(): Path[] {
        let result = this.fillPaths();
        if (this.miniBubbleStrokePaths) {
            result = [...result, ...this.miniBubbleStrokePaths];
        }
        return result;
    }

    // Enhance: I think all the rest of this code is shared with ArcTail and can move
    // to a base class.
    adjustForChangedRoot(delta: Point): void {
        let newPosition = this.mid.add(delta.divide(2));
        if (this.bubble && this.spec.autoCurve) {
            newPosition = Bubble.defaultMid(this.currentStartPoint(), this.tip);
        }
        if (this.bubble) {
            newPosition = Comical.movePointOutsideBubbleContent(this.bubble.content, newPosition);
        }
        this.mid = newPosition;
        if (this.midHandle) {
            this.midHandle.position = newPosition;
        }
        if (this.spec) {
            this.spec.midpointX = newPosition.x!;
            this.spec.midpointY = newPosition.y!;
        }
    }

    adjustForChangedTip(delta: Point): void {
        this.adjustForChangedRoot(delta);
    }

    protected showHandlesInternal(): void {
        super.showHandlesInternal();
        const isHandleSolid = !this.spec.autoCurve;
        const curveHandle = this.makeHandle(this.mid, isHandleSolid);

        this.midHandle = curveHandle;

        curveHandle.bringToFront();
        curveHandle.onMouseDown = () => {
            this.state = "dragCurve";
        };
        curveHandle.onMouseUp = () => {
            this.state = "idle";
        };

        curveHandle.onMouseDrag = (event: ToolEvent) => {
            if (this.state !== "dragCurve") {
                return;
            }
            if (this.bubble) {
                const [parentElement] = Comical.comicalParentOf(this.bubble.content);
                if (
                    parentElement &&
                    Comical.bubbleWithContentAtPoint(parentElement, event.point!.x!, event.point!.y!)
                ) {
                    return; // refuse to drag mid to a point inside a bubble
                }
            }
            this.spec.autoCurve = false;
            curveHandle.fillColor!.alpha = 1;
            curveHandle.position = event.point;
            this.mid = event.point!;
            this.makeShapes();

            // Update this.spec.tips to reflect the new handle positions
            this.spec.midpointX = curveHandle!.position!.x!;
            this.spec.midpointY = curveHandle!.position!.y!;
            this.persistSpecChanges();
        };

        curveHandle.onDoubleClick = () => {
            this.spec.autoCurve = true;
            this.adjustForChangedRoot(new Point(0, 0));
            this.makeShapes();
            this.persistSpecChanges();
            Tail.makeTransparentClickable(curveHandle);
        };
    }

    public setTailAndHandleVisibility(newVisibility: boolean) {
        super.setTailAndHandleVisibility(newVisibility);
        if (this.midHandle) {
            this.midHandle.visible = newVisibility;
        }
    }
}
