import { Path, Point, Color, Layer, ToolEvent } from "paper";
import Comical from "./comical";
import { TailSpec } from "bubbleSpec";
import Bubble from "./bubble";

export class Tail {
  // the path representing the line around the tail
  pathstroke: Path;
  // the path representing the space within the tail
  pathFill: Path;

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
    if (this.bubble) {
      return this.bubble.backgroundColor();
    }
    return Comical.backColor;
  }

  // Make the shapes that implement the tail.
  // If there are existing shapes (typically representing an earlier tail position),
  // remove them after putting the new shapes in the same z-order (and eventually layer).
  // Todo: might well take layer arguments? Or perhaps constructor does this and saves them?
  public makeShapes() {
    const oldFill = this.pathFill;
    const oldStroke = this.pathstroke;

    this.lowerLayer.activate();

    const tailWidth = 25;
    // we want to make the base of the tail a line of length tailWidth
    // at right angles to the line from root to mid
    // centered at root.
    const angleBase = new Point(
      this.mid.x! - this.root.x!,
      this.mid.y! - this.root.y!
    ).angle!;
    const deltaBase = new Point(0, 0);
    deltaBase.angle = angleBase + 90;
    deltaBase.length = tailWidth / 2;
    const begin = this.root.add(deltaBase);
    const end = this.root.subtract(deltaBase);

    // The midpoints of the arcs are a quarter base width either side of mid,
    // offset at right angles to the root/tip line.
    const angleMid = new Point(
      this.tip.x! - this.root.x!,
      this.tip.y! - this.root.y!
    ).angle!;
    const deltaMid = new Point(0, 0);
    deltaMid.angle = angleMid + 90;
    deltaMid.length = tailWidth / 4;
    const mid1 = this.mid.add(deltaMid);
    const mid2 = this.mid.subtract(deltaMid);

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
    this.pathFill.onClick = action;
  }

  adjustRoot(newRoot: Point): boolean {
    const delta = newRoot.subtract(this.root!).divide(2);
    if (Math.abs(delta.x!) + Math.abs(delta.y!) < 0.0001) {
      // hasn't moved; very likely adjustSize triggered by an irrelevant change to object;
      // We MUST NOT trigger the mutation observer again, or we get an infinte loop that
      // freezes the whole page.
      return false;
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
    return true;
  }

  adjustTip(newTip: Point): boolean {
    const delta = newTip.subtract(this.tip!).divide(2);
    if (Math.abs(delta.x!) + Math.abs(delta.y!) < 0.0001) {
      // hasn't moved; very likely adjustSize triggered by an irrelevant change to object;
      // We MUST NOT trigger the mutation observer again, or we get an infinte loop that
      // freezes the whole page.
      return false;
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
    return true;
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
    const curveHandle = this.makeHandle(this.mid);

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
      tipHandle = this.makeHandle(this.tip);
      tipHandle.onMouseDown = () => {
        state = "dragTip";
      };
      tipHandle.onMouseUp = curveHandle.onMouseUp = () => {
        state = "idle";
      };
      tipHandle.onMouseDrag = curveHandle.onMouseDrag;
    }
  }

  // Helps determine unique names for the handles
  static handleIndex = 0;

  private makeHandle(tip: Point): Path.Circle {
    this.handleLayer.activate();
    const result = new Path.Circle(tip, 8);
    result.strokeColor = new Color("aqua");
    result.strokeWidth = 2;
    result.fillColor = new Color("white");
    // We basically want the bubbles transparent, especially for the tip, so
    // you can see where the tip actually ends up. But if it's perfectly transparent,
    // paper.js doesn't register hit tests on the transparent part. So go for a very
    // small alpha.
    result.fillColor.alpha = 0.01;
    result.name = "handle" + Tail.handleIndex++;
    return result;
  }
}
