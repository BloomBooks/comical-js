import { Point, Path, Color, Item } from "paper";
import { Bubble } from "./bubble";

// Make a computed bubble shape by drawing an outward arc between each pair of points
// in the array produced by makeBubbleItem.
// This is currently very similar to Bubble.makePointedArcBubble, differing only
// in some constants and adding deltaCenter instead of subtracting it.
// However, I'm not sure things will stay that way, so I'm leaving the
// duplication for now. It's a fairly small chunk of code.
export function makeThoughtBubble(bubble: Bubble): Item {
    const borderWidth = 10;
    const arcDepth = 15;
    return bubble.makeBubbleItem(borderWidth, 0, (points, center) => {
        const outline = new Path();
        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            const end = i < points.length - 1 ? points[i + 1] : points[0];
            const mid = new Point((start.x! + end.x!) / 2, (start.y! + end.y!) / 2);
            const deltaCenter = mid.subtract(center);
            deltaCenter.length = arcDepth;
            const arcPoint = mid.add(deltaCenter);
            const arc = new Path.Arc(start, arcPoint, end);
            arc.remove();
            outline.addSegments(arc.segments!);
        }
        outline.strokeWidth = bubble.getBorderWidth();
        outline.strokeColor = new Color("black");
        outline.closed = true; // It should already be, but may help paper.js to treat it so.
        return outline;
    });
}
