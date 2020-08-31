import { Color, Group, Item, Path, Size, Rectangle } from "paper";
import { Bubble } from "./bubble";

// bubble: The bubble around which to make a caption
// cornerRadii - Omit or pass undefined for square corners. For rounded corners, pass in the two radius amounts as a Size object.
export function makeCaptionBox(bubble: Bubble, cornerRadii?: Size): Item {
    const contentHolder = bubble.getDefaultContentHolder();
    const contentBounds = contentHolder.bounds!;

    const outline = makeOutline(contentBounds, cornerRadii);

    const result = new Group([outline, contentHolder]);
    return result;
}

function makeOutline(bounds: paper.Rectangle, cornerRadii?: Size): Path.Rectangle {
    const delta = 1;
    const outlineTopLeft = bounds.topLeft!.subtract(delta);
    const outlineSize = new Size(bounds.size!.add(delta * 2));

    const outlineRect = new Rectangle(outlineTopLeft, outlineSize);
    const outline = new Path.Rectangle(outlineRect, cornerRadii);

    outline.name = "outlineShape";
    outline.strokeColor = new Color("black");
    return outline;
}
