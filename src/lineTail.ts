import { Tail } from "./tail";
import { Point, Layer, Path, Color } from "paper";
import { TailSpec } from "bubbleSpec";
import { Bubble } from "bubble";

export class LineTail extends Tail {
  public constructor(
    root: Point,
    tip: Point,
    lowerLayer: Layer,
    upperLayer: Layer,
    handleLayer: Layer,
    spec: TailSpec,
    bubble: Bubble | undefined
  ) {
    super(root, tip, lowerLayer, upperLayer, handleLayer, spec, bubble);
  }

  public makeShapes() {
    const oldStroke = this.pathstroke;
    this.lowerLayer.activate();

    const tailWidth = 1; // Single pixel may not be thick enough to see it on an image

    this.pathstroke = new Path.Line(this.root, this.tip);

    if (oldStroke) {
      this.pathstroke.insertBelow(oldStroke);
      oldStroke.remove();
    }

    this.pathstroke.strokeColor = new Color("black");
    this.pathstroke.strokeWidth = tailWidth;
  }
}
