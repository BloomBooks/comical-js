import paper = require("paper");

// Implements a simple circular bubble.
// Eventually we'd like to use https://developer.mozilla.org/en-US/docs/Web/CSS/shape-outside to try to make the
// text wrap optimally to fill the bubble. But that requires at least Firefox 62 and Bloom Editor is still stuck
// on GeckoFx 60. (And it may not be trivial, even so.)
export function makeCircleBubble(width: number, height: number): paper.Item {
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
    const radius = Math.sqrt(xCenter * xCenter + yCenter * yCenter); // fix if top/left not zero
    const path = new paper.Path.Circle(new paper.Point(xCenter, yCenter), radius);
    path.name = "outlineShape";
    path.strokeColor = new paper.Color("black");
    const contentHolder = new paper.Shape.Rectangle(
        new paper.Point(left, top),
        new paper.Point(left + width, top + height)
    );
    contentHolder.name = "content-holder";

    // the contentHolder is normally removed, but this might be useful in debugging.
    contentHolder.strokeColor = new paper.Color("red");
    contentHolder.fillColor = new paper.Color("transparent");
    const result = new paper.Group([path, contentHolder]);
    return result;
}
