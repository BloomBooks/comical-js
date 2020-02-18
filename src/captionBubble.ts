import { Color, Group, Item, Point, Shape, Size } from "paper";
import { Bubble } from "./bubble";

export function makeCaptionBox(bubble: Bubble): Item {
    const contentTopLeft = new Point(bubble.content.offsetLeft, bubble.content.offsetTop);
    const contentSize = new Size(bubble.content.offsetWidth, bubble.content.offsetHeight);
    const contentHolder = new Shape.Rectangle(contentTopLeft, contentSize);

    // the contentHolder is normally removed, but this might be useful in debugging.
    contentHolder.strokeColor = new Color("red");
    contentHolder.fillColor = new Color("transparent");
    contentHolder.name = "content-holder";

    const delta = 1;
    const outlineTopLeft = contentTopLeft.subtract(delta);
    const outlineSize = contentSize.add(delta * 2);
    const outline = new Shape.Rectangle(outlineTopLeft, outlineSize);

    outline.name = "outlineShape";
    outline.strokeColor = new Color("black");
    // TODO: Stroke width?
    outline.strokeWidth = bubble.getBorderWidth();

    // TODO: Promising, but the gradient died.

    const result = new Group([outline, contentHolder]);
    return result;
}
