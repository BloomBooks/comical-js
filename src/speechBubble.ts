import { Segment, Point, Path, Color, Group, Shape, Item } from "paper";

// This file contains the definition for how a speech bubble is made.
// It is roughly an oval, but actually made as a sequence of four bezier curves,
// which allows it to vary in shape. You can imagine (or see, in the "playing with beziers"
// test case) that there is a control point in the middle of each side of the rectangle,
// with handles in the direction of the corners. The handleFraction arguments control
// what fraction of the distance to the corner the handles are placed. 0.6, 0.8 seems
// to give a nice default. Larger values make the shape more like a rounded rectangle,
// smaller ones more like an ellipse (or even a diamond).
export function makeSpeechBubble(
  width: number,
  height: number,
  xHandleFraction: number,
  yHandleFraction: number
): Item {
  // Because of the way the bubble code aligns the content-holder
  // rectangle with the content element, the values used for top and left
  // currently make absolutely no difference. They translate the bubble,
  // and the content-holder alignment adjusts for it. I'm keeping the
  // variables in case we might want control over the position one day
  // (maybe in debugging?).
  const top = 0;
  const left = 0;
  const xCenter = left + width / 2;
  const yCenter = top + height / 2;
  const right = left + width;
  const bottom = top + height;
  const xHandleOffset = (width / 2) * xHandleFraction;
  const yHandleOffset = (height / 2) * yHandleFraction;
  var firstSegment = new Segment({
    point: new Point(xCenter, top),
    handleOut: new Point(xHandleOffset, 0),
    handleIn: new Point(-xHandleOffset, 0)
  });
  var secondSegment = new Segment({
    point: new Point(right, yCenter),
    handleIn: new Point(0, -yHandleOffset),
    handleOut: new Point(0, yHandleOffset)
  });
  var thirdSegment = new Segment({
    point: new Point(xCenter, bottom),
    handleIn: new Point(xHandleOffset, 0),
    handleOut: new Point(-xHandleOffset, 0)
  });
  var fourthSegment = new Segment({
    point: new Point(left, yCenter),
    handleIn: new Point(0, yHandleOffset),
    handleOut: new Point(0, -yHandleOffset)
  });
  const path = new Path({
    segments: [firstSegment, secondSegment, thirdSegment, fourthSegment],
    strokeColor: new Color("black")
  });
  path.name = "outlineShape";
  // This calculation was a bit of inspired guess-work, but it seems to
  // give a pair of points that are a good place for the corners of the rectangle
  // that defines where the text will go inside the bubble.
  const topRightCurve = path.curves[0];
  const topRight = topRightCurve.getLocationAt(
    (topRightCurve.length * width) / (width + height)
  ).point;
  const bottomLeftCurve = path.curves[2];
  const bottomLeft = bottomLeftCurve.getLocationAt(
    (bottomLeftCurve.length * width) / (width + height)
  ).point;
  const contentHolder = new Shape.Rectangle(topRight, bottomLeft);
  // the contentHolder is normally removed, but this might be useful in debugging.
  contentHolder.strokeColor = new Color("red");
  contentHolder.fillColor = new Color("transparent");
  contentHolder.name = "content-holder";
  path.closed = true; // causes it to fill in the curve back to the start
  const result = new Group([path, contentHolder]);
  return result;
}
