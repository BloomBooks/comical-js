import paper = require("paper");
import { Bubble } from "./bubble";
import { SimpleRandom } from "./random";

// Make a computed bubble shape by drawing an outward arc between each pair of points
// in the array produced by makeBubbleItem.
// This is currently very similar to Bubble.makePointedArcBubble, differing only
// in some constants and adding deltaCenter instead of subtracting it.
// However, I'm not sure things will stay that way, so I'm leaving the
// duplication for now. It's a fairly small chunk of code.
export function makeThoughtBubble(bubble: Bubble): paper.Item {
    const arcDepth = 9;
    // Seed the random number generator with a value predictable enough
    // that it will look the same each time the page is opened...
    // in fact it will go back to the same shape if the bubble grows
    // and then shrinks back to its original size.
    const width = bubble.content.clientWidth;
    const height = bubble.content.clientHeight;
    const rng = new SimpleRandom(width + height);

    return bubble.makeBubbleItem(0, (points, center) => {
        const outline = new paper.Path();
        const maxJitter = arcDepth / 2;
        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            const end = i < points.length - 1 ? points[i + 1] : points[0];
            const mid = new paper.Point((start.x + end.x) / 2, (start.y + end.y) / 2);
            const deltaCenter = mid.subtract(center);
            // The rng here gives the bubbles a slightly 'random' depth of curve
            const jitter = maxJitter * rng.nextDouble();
            deltaCenter.length = arcDepth - jitter;
            const arcPoint = mid.add(deltaCenter);
            const arc = new paper.Path.Arc(start, arcPoint, end);
            arc.remove();
            outline.addSegments(arc.segments);
        }
        outline.strokeWidth = bubble.getBorderWidth();
        outline.strokeColor = new paper.Color("black");
        outline.closed = true; // It should already be, but may help paper.js to treat it so.
        outline.name = "outlineShape";
        return outline;
    });
}
