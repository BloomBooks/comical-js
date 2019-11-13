import { Layer, Point, Path } from "paper";

// a place for useful functions that don't seem to belong in any particular class.

// Surprisingly, activating a layer does NOT activate its project automatically,
// resulting in new objects that were expected to go into the just-activated
// layer actually going into the activeLayer of the active project.
// This function activates both the layer and its project, so new objects
// automatically go into this layer.
export function activateLayer(layer: Layer) {
    if (layer) {
        layer.project.activate();
        layer.activate();
    }
}

export function makeArc(start: Point, mid: Point, end: Point): Path {
    // Path.Arc fails when the points are on a straight line.
    // In that case, just return the line.
    // This includes the pathological case where mid on the line through start and end,
    // but not between them. In that case, it's not possible to draw an arc
    // that includes the three points, so we'll still go with a line from
    // start to end.
    const angleDiff = Math.abs(mid.subtract(start).angle! - end.subtract(start).angle!);
    if (angleDiff < 0.0001 || Math.abs(angleDiff - 180) < 0.0001) {
        return new Path.Line(start, end);
    }
    return new Path.Arc(start, mid, end);
}
