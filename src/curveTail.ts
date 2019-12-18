import { Tail } from "./tail";
import { Point, Size } from "paper";
import { Comical } from "./comical";
import { Bubble } from "./bubble";
import { Handle } from "./handle";

// An abstract class for tails which, like ArcTail and ThoughtTail,
// have a handle to control a mid-point which configures their shape.
// Typically something follows a curve through the midpoint to the tip.
export class CurveTail extends Tail {
    mid: Point;

    // This may be set to ensure that when the tail's midpoint is moved
    // automatically (e.g., to adjust for the root moving), the corresponding
    // handle is moved too.
    midHandle: Handle;

    adjustForChangedRoot(delta: Point): void {
        let newPosition = this.mid.add(delta.divide(2));
        if (this.bubble && this.spec.autoCurve) {
            const parent = Comical.findParent(this.bubble);
            newPosition = Bubble.defaultMid(
                this.currentStartPoint(),
                this.tip,
                new Size(this.bubble.content.offsetWidth, this.bubble.content.offsetHeight),
                parent ? new Size(parent.content.offsetWidth, parent.content.offsetHeight) : undefined
            );
        }
        if (this.bubble) {
            newPosition = Comical.movePointOutsideBubble(this.bubble.content, newPosition, this.tip, this.root);
        }
        this.mid = newPosition;
        if (this.midHandle) {
            this.midHandle.setPosition(newPosition);
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
        this.midHandle = new Handle(this.handleLayer, this.mid, !!this.spec.autoCurve);
        this.midHandle.bringToFront();
        this.midHandle.onDrag = (where: Point) => {
            if (this.bubble) {
                const [parentElement] = Comical.comicalParentOf(this.bubble.content);
                if (parentElement && Comical.getBubbleHit(parentElement, where.x!, where.y!)) {
                    return; // refuse to drag mid to a point inside a bubble
                }
            }
            this.spec.autoCurve = false;
            this.midHandle!.setAutoMode(false);
            this.midHandle!.setPosition(where);
            this.mid = where;
            this.makeShapes();

            // Update this.spec.tips to reflect the new handle positions
            this.spec.midpointX = where.x!;
            this.spec.midpointY = where.y!;
            this.persistSpecChanges();
        };

        this.midHandle.onDoubleClick = () => {
            this.spec.autoCurve = true;
            this.adjustForChangedRoot(new Point(0, 0));
            this.makeShapes();
            this.persistSpecChanges();
            this.midHandle.setAutoMode(true);
        };
    }

    public setTailAndHandleVisibility(newVisibility: boolean) {
        super.setTailAndHandleVisibility(newVisibility);
        if (this.midHandle) {
            this.midHandle.setVisibility(newVisibility);
        }
    }
}
