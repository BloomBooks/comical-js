import { Path, Point, Color, Layer, ToolEvent } from "paper";
import Comical from "./comical";
import { TailSpec } from "bubbleSpec";
import Bubble from "./bubble";

export class Tail {
  // the path representing the line around the tail
  pathstroke: Path;
  // the path representing the space within the tail
  pathFill: Path;

  public debugMode: boolean;

  lowerLayer: Layer;
  upperLayer: Layer;
  handleLayer: Layer;

  root: Point;
  tip: Point;
  mid: Point;
  // This may be set to ensure that when the tail's midpoint is moved
  // automatically (e.g., to adjust for the root moving), the corresponding
  // handle is moved too.
  midHandle: Path | undefined;
  spec: TailSpec;
  bubble: Bubble | undefined;
  mark1: Path.Circle | undefined;
  mark2: Path.Circle | undefined;
  clickAction: () => void;

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
    this.lowerLayer = lowerLayer;
    this.upperLayer = upperLayer;
    this.handleLayer = handleLayer;
    this.spec = spec;

    this.root = root;
    this.tip = tip;
    this.mid = mid;
    this.bubble = bubble;
    this.makeShapes();
  }

  private getFillColor(): Color {
    if (this.debugMode) {
      return new Color("yellow");
    }
    if (this.bubble) {
      return this.bubble.getBackgroundColor();
    }
    return Comical.backColor;
  }

  // Make the shapes that implement the tail.
  // If there are existing shapes (typically representing an earlier tail position),
  // remove them after putting the new shapes in the same z-order and layer.
  public makeShapes() {
    const oldFill = this.pathFill;
    const oldStroke = this.pathstroke;

    this.lowerLayer.activate();

    const tailWidth = 12;

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

    const midPointRootTip = new Point(
      (this.tip.x! + this.root.x!) / 2,
      (this.tip.y! + this.root.y!) / 2
    );
    const angleRootTip = new Point(
      this.tip.x! - this.root.x!,
      this.tip.y! - this.root.y!
    ).angle!;

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
    const tempArc = new Path.Arc(this.root, this.mid, this.tip);
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
    const angleBase = new Point(
      adjustedMid.x! - this.root.x!,
      adjustedMid.y! - this.root.y!
    ).angle!;
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
      this.upperLayer.activate();
      this.mark1 = new Path.Circle(mid1, 3);
      this.mark1.fillColor = this.mark1.strokeColor = new Color("red");
      this.mark2 = new Path.Circle(mid2, 3);
      this.mark2.fillColor = this.mark2.strokeColor = new Color("red");
      this.lowerLayer.activate();
    }

    this.pathstroke = new Path.Arc(begin, mid1, this.tip);
    if (oldStroke) {
      oldStroke.remove();
    }
    const pathArc2 = new Path.Arc(this.tip, mid2, end);
    this.pathstroke.addSegments(pathArc2.segments!);
    pathArc2.remove();
    this.upperLayer.activate();
    this.pathFill = this.pathstroke.clone() as Path;
    this.pathFill.remove();
    this.upperLayer.addChild(this.pathFill);
    this.pathstroke.strokeColor = new Color("black");
    this.pathFill.fillColor = this.getFillColor();
    if (this.clickAction) {
      this.pathFill.onClick = this.clickAction;
    }
    if (oldFill) {
      oldFill.remove();
    }
  }

  updatePoints(root: Point, tip: Point, mid: Point) {
    this.root = root;
    this.tip = tip;
    this.mid = mid;
    this.makeShapes();
  }

  public onClick(action: () => void) {
    this.clickAction = action;
    if (this.pathFill) {
      this.pathFill.onClick = action;
    }
  }

  adjustRoot(newRoot: Point): void {
    const delta = newRoot.subtract(this.root!).divide(2);
    if (Math.abs(delta.x!) + Math.abs(delta.y!) < 0.0001) {
      // hasn't moved; very likely adjustSize triggered by an irrelevant change to object;
      // We MUST NOT trigger the mutation observer again, or we get an infinte loop that
      // freezes the whole page.
      return;
    }
    const newMid = this.mid.add(delta);
    this.updatePoints(newRoot, this.tip, newMid);
    if (this.midHandle) {
      this.midHandle.position = newMid;
    }
    if (this.spec) {
      this.spec.midpointX = this.mid.x!;
      this.spec.midpointY = this.mid.y!;
    }
    this.persistSpecChanges();
  }

  adjustTip(newTip: Point): void {
    const delta = newTip.subtract(this.tip!).divide(2);
    if (Math.abs(delta.x!) + Math.abs(delta.y!) < 0.0001) {
      // hasn't moved; very likely adjustSize triggered by an irrelevant change to object;
      // We MUST NOT trigger the mutation observer again, or we get an infinte loop that
      // freezes the whole page.
      return;
    }
    const newMid = this.mid.add(delta);
    this.updatePoints(this.root, newTip, newMid);
    if (this.midHandle) {
      this.midHandle.position = newMid;
    }
    if (this.spec) {
      this.spec.midpointX = this.mid.x!;
      this.spec.midpointY = this.mid.y!;
      this.spec.tipX = this.tip.x!;
      this.spec.tipY = this.tip.y!;
    }
    this.persistSpecChanges();
  }

  // Erases the tail from the canvas
  remove() {
    this.pathFill.remove();
    this.pathstroke.remove();
  }

  currentStartPoint(): Point {
    if (this.bubble) {
      return this.bubble.calculateTailStartPoint();
    }
    return this.root;
  }

  public showHandles() {
    const isHandleSolid = true;
    const curveHandle = this.makeHandle(this.mid, isHandleSolid);

    this.midHandle = curveHandle;

    curveHandle.bringToFront();

    // Setup event handlers
    let state = "idle";
    curveHandle.onMouseDown = () => {
      state = "dragCurve";
    };
    let tipHandle: Path.Circle | undefined;
    curveHandle.onMouseDrag = (event: ToolEvent) => {
      if (state === "dragTip") {
        // tipHandle can't be undefined at this point
        const delta = event.point!.subtract(tipHandle!.position!).divide(2);
        tipHandle!.position = event.point;
        // moving the curve handle half as much is intended to keep
        // the curve roughly the same shape as the tip moves.
        // It might be more precise if we moved it a distance
        // proportional to how close it is to the tip to begin with.
        // Then again, we may decide to constrain it to stay
        // equidistant from the root and tip.
        curveHandle.position = curveHandle.position!.add(delta);
      } else if (state === "dragCurve") {
        curveHandle.position = event.point;
      } else {
        return;
      }

      const startPoint = this.currentStartPoint(); // Refresh the calculation, in case the content element moved.

      const newTipPosition = tipHandle ? tipHandle.position! : this.tip;
      this.updatePoints(startPoint, newTipPosition, curveHandle.position!);
      curveHandle.bringToFront();

      // Update this.spec.tips to reflect the new handle positions
      this.spec.tipX = newTipPosition.x!;
      this.spec.tipY = newTipPosition.y!;
      this.spec.midpointX = curveHandle!.position!.x!;
      this.spec.midpointY = curveHandle!.position!.y!;

      if (this.bubble) {
        this.bubble.persistBubbleSpecWithoutMonitoring();
      }
    };
    if (!this.spec.joiner) {
      // usual case...we want a handle for the tip as well.
      const isHandleSolid = false;
      tipHandle = this.makeHandle(this.tip, isHandleSolid);
      tipHandle.onMouseDown = () => {
        state = "dragTip";
      };
      tipHandle.onMouseUp = curveHandle.onMouseUp = () => {
        state = "idle";
      };
      tipHandle.onMouseDrag = curveHandle.onMouseDrag;
    }
  }

  private persistSpecChanges() {
    if (this.bubble) {
      this.bubble.persistBubbleSpecWithoutMonitoring();
    }
  }

  // Helps determine unique names for the handles
  static handleIndex = 0;

  private makeHandle(tip: Point, solid: boolean): Path.Circle {
    this.handleLayer.activate();
    const result = new Path.Circle(tip, 5);
    result.strokeColor = new Color("#1d94a4");
    result.fillColor = new Color("#1d94a4"); // a distinct instance of Color, may get made transparent below
    result.strokeWidth = 1;
    // We basically want non-solid bubbles transparent, especially for the tip, so
    // you can see where the tip actually ends up. But if it's perfectly transparent,
    // paper.js doesn't register hit tests on the transparent part. So go for a very
    // small alpha.
    if (!solid) {
      result.fillColor.alpha = 0.01;
    }
    result.name = "handle" + Tail.handleIndex++;
    return result;
  }
}
