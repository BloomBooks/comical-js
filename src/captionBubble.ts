import { Color, Group, Item, Path, Size } from "paper";
import { Bubble } from "./bubble";

export function makeCaptionBox(bubble: Bubble): Item {
    const contentHolder = bubble.getDefaultContentHolder();
    const contentBounds = contentHolder.bounds!;

    const delta = 1;
    const outlineTopLeft = contentBounds.topLeft!.subtract(delta);
    const outlineSize = new Size(contentBounds.size!.add(delta * 2));
    const outline = new Path.Rectangle(outlineTopLeft, outlineSize);

    outline.name = "outlineShape";
    outline.strokeColor = new Color("black");

    const result = new Group([outline, contentHolder]);
    return result;
}
