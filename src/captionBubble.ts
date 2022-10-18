import paper = require("paper");
import { Bubble } from "./bubble";

// bubble: The bubble around which to make a caption
// cornerRadii - Omit or pass undefined for square corners. For rounded corners, pass in the two radius amounts as a Size object.
export function makeCaptionBox(bubble: Bubble, cornerRadii: paper.Size | undefined, thickness: number): paper.Item {
    const contentHolder = bubble.getDefaultContentHolder();
    const contentBounds = contentHolder.bounds;

    const outline = makeOutline(contentBounds, cornerRadii, thickness);

    const result = new paper.Group([outline, contentHolder]);
    return result;
}

// The outline will be delta outside the bounds. Typically delta is the border thickness.
function makeOutline(
    bounds: paper.Rectangle,
    cornerRadii: paper.Size | undefined,
    delta: number
): paper.Path.Rectangle {
    const outlineTopLeft = bounds.topLeft.subtract(delta);
    const outlineSize = new paper.Size(bounds.size.add(delta * 2));

    const outlineRect = new paper.Rectangle(outlineTopLeft, outlineSize);
    const outline = new paper.Path.Rectangle(outlineRect, cornerRadii);

    outline.name = "outlineShape";
    outline.strokeColor = new paper.Color("black");
    return outline;
}
