import { Path, Point, Color, Layer} from "paper";
import Comical from "./comical";

export class Tail {
    // the path representing the line around the tail
    pathstroke: Path;
    // the path representing the space within the tail
    pathFill: Path;

    lowerLayer: Layer;
    upperLayer: Layer;

    public constructor(
        root: Point,
        tip: Point,
        mid: Point,
        lowerLayer: Layer,
        upperLayer: Layer
      ) {
        this.lowerLayer = lowerLayer;
        this.upperLayer = upperLayer;
        this.lowerLayer.activate();
        const tailWidth = 25;
        // we want to make the base of the tail a line of length tailWidth
        // at right angles to the line from root to mid
        // centered at root.
        const angleBase = new Point(mid.x! - root.x!, mid.y! - root.y!).angle!;
        const deltaBase = new Point(0, 0);
        deltaBase.angle = angleBase + 90;
        deltaBase.length = tailWidth / 2;
        const begin = root.add(deltaBase);
        const end = root.subtract(deltaBase);
    
        // The midpoints of the arcs are a quarter base width either side of mid,
        // offset at right angles to the root/tip line.
        const angleMid = new Point(tip.x! - root.x!, tip.y! - root.y!).angle!;
        const deltaMid = new Point(0, 0);
        deltaMid.angle = angleMid + 90;
        deltaMid.length = tailWidth / 4;
        const mid1 = mid.add(deltaMid);
        const mid2 = mid.subtract(deltaMid);
    
        this.pathstroke = new Path.Arc(begin, mid1, tip);
        const pathArc2 = new Path.Arc(tip, mid2, end);
        this.pathstroke.addSegments(pathArc2.segments!);
        pathArc2.remove();
        this.upperLayer.activate();
        this.pathFill = this.pathstroke.clone() as Path;
        this.pathFill.remove();
        this.upperLayer.addChild(this.pathFill);
        this.pathstroke.strokeColor = new Color("black");
        this.pathFill.fillColor = Comical.backColor;
      }
      public replaceWith(other: Tail) {
          other.pathstroke.insertBelow(this.pathstroke);
          other.pathFill.insertBelow(this.pathFill);
          this.pathstroke.remove();
          this.pathFill.remove();
          this.pathstroke = other.pathstroke;
          this.pathFill = other.pathFill;
      }
}