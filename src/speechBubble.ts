import paper = require("paper");

// This file contains the definition for how a speech bubble is made.
// It is roughly an oval, but actually made as a sequence of four bezier curves,
// which allows it to vary in shape. You can imagine (or see, in the "playing with beziers"
// test case) that there is a control point in the middle of each side of the rectangle,
// with handles in the direction of the corners. The handleFraction arguments control
// what fraction of the distance to the corner the handles are placed. 0.6, 0.8 seems
// to give a nice default. Larger values make the shape more like a rounded rectangle,
// smaller ones more like an ellipse (or even a diamond).
export function makeSpeechBubbleParts(
    width: number,
    height: number,
    xHandleFraction: number,
    yHandleFraction: number
): [paper.Path, paper.Shape.Rectangle] {
    if (width <= 0) {
        console.assert(false, `Invalid width. Received: ${width}. Expected: width > 0`);
        width = 1;
    }
    if (height <= 0) {
        console.assert(false, `Invalid height. Received: ${height}. Expected: height > 0`);
        height = 1;
    }
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
    var firstSegment = new paper.Segment({
        point: new paper.Point(xCenter, top),
        handleOut: new paper.Point(xHandleOffset, 0),
        handleIn: new paper.Point(-xHandleOffset, 0)
    });
    var secondSegment = new paper.Segment({
        point: new paper.Point(right, yCenter),
        handleIn: new paper.Point(0, -yHandleOffset),
        handleOut: new paper.Point(0, yHandleOffset)
    });
    var thirdSegment = new paper.Segment({
        point: new paper.Point(xCenter, bottom),
        handleIn: new paper.Point(xHandleOffset, 0),
        handleOut: new paper.Point(-xHandleOffset, 0)
    });
    var fourthSegment = new paper.Segment({
        point: new paper.Point(left, yCenter),
        handleIn: new paper.Point(0, yHandleOffset),
        handleOut: new paper.Point(0, -yHandleOffset)
    });
    const path = new paper.Path({
        segments: [firstSegment, secondSegment, thirdSegment, fourthSegment],
        strokeColor: new paper.Color("black")
    });
    path.name = "outlineShape";
    // This calculation was a bit of inspired guess-work, but it seems to
    // give a pair of points that are a good place for the corners of the rectangle
    // that defines where the text will go inside the bubble.
    const topRightCurve = path.curves[0];
    const topRight = topRightCurve.getLocationAt((topRightCurve.length * width) / (width + height)).point;
    const bottomLeftCurve = path.curves[2];
    const bottomLeft = bottomLeftCurve.getLocationAt((bottomLeftCurve.length * width) / (width + height)).point;
    const contentHolder = new paper.Shape.Rectangle(topRight, bottomLeft);
    contentHolder.name = "content-holder";

    // the contentHolder is normally removed, but this might be useful in debugging.
    contentHolder.strokeColor = new paper.Color("red");
    contentHolder.fillColor = new paper.Color("transparent");
    path.closed = true; // causes it to fill in the curve back to the start
    return [path, contentHolder];
}

export function makeSpeechBubble(
    width: number,
    height: number,
    xHandleFraction: number,
    yHandleFraction: number
): paper.Item {
    const [path, contentHolder] = makeSpeechBubbleParts(width, height, xHandleFraction, yHandleFraction);
    const result = new paper.Group([path, contentHolder]);
    return result;
}
