import { Tail } from "./tail";
import { Point, Path, ToolEvent } from "paper";
import { Comical } from "./comical";
import { Bubble } from "./bubble";

// An abstract class for tails which, like ArcTail and ThoughtTail,
// have a handle to control a mid-point which configures their shape.
// Typically something follows a curve through the midpoint to the tip.
export class CurveTail extends Tail {
    mid: Point;

    // This may be set to ensure that when the tail's midpoint is moved
    // automatically (e.g., to adjust for the root moving), the corresponding
    // handle is moved too.
    midHandle: Path | undefined;

    adjustForChangedRoot(delta: Point): void {
        let newPosition = this.mid.add(delta.divide(2));
        if (this.bubble && this.spec.autoCurve) {
            newPosition = Bubble.defaultMid(this.currentStartPoint(), this.tip);
        }
        if (this.bubble) {
            newPosition = Comical.movePointOutsideBubble(this.bubble.content, newPosition, this.tip);
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
                if (parentElement && Comical.getBubbleHit(parentElement, event.point!.x!, event.point!.y!)) {
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
