import { Path, Point, Color, Layer } from "paper";
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
    spec: TailSpec,
    bubble: Bubble | undefined
  ) {
    this.lowerLayer = lowerLayer;
    this.upperLayer = upperLayer;
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
    return true;
  }

  // Erases the tail from the canvas
  remove() {
    this.pathFill.remove();
    this.pathstroke.remove();
  }
}
