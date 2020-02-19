import { Color, Group, Item, Path, Point, Size } from "paper";
import { Bubble } from "./bubble";

// This is just a port of the original ellipse SVG into algorithmic format instead.
// It is supposed to look and operate pretty much identically.
//
// One key thing to note about both this and the SVG is that as the content size increases,
// the axis length is scaled up accordingly. A ramification of this is that if only one edge of the
// content element is increased, both edges of the ellipse on that axis will actually move, which may be surprising.
export function makeScaledEllipseBubble(bubble: Bubble): Item {
    const contentHolder = bubble.getDefaultContentHolder();
    const contentBounds = contentHolder.bounds!;

    // These values are pulled/calculated from the SVG. You can pretty them up if you like
    // e.g. round off numbers,
    //      or fix the implied center of the SVG's content holder to align more precisely with the center of the SVG's outlineShape
    //      (Implied center of modelContentHolder is 50.459818, 50.012659)
    const modelCenter = new Point(50.3653, 50.10715); // y = 247.10715 with a translateY(-197)
    const modelRadius = new Size(49.608364, 49.702854);
    const modelContentHolderTopLeft = new Point(13.229166, 17.03423); // y = 214.03423 with a translateY(-197)

    // Derived by solving the following proportion:
    // modelContentHolderLeftOffset / modelEllipseRadiusX = contentHolderLeftOffset / outlineEllipseRadiusX
    // (where outlineEllipseRadiusX is what we need to solve for)

    const outlineRadiusX =
        (modelRadius.width! / (modelCenter.x! - modelContentHolderTopLeft.x!)) *
        (contentBounds.center!.x! - contentBounds.left!);
    const outlineRadiusY =
        (modelRadius.height! / (modelCenter.y! - modelContentHolderTopLeft.y!)) *
        (contentBounds.center!.y! - contentBounds.top!);

    const outline = new Path.Ellipse({
        center: [contentBounds.center!.x!, contentBounds.center!.y!],
        radius: [outlineRadiusX, outlineRadiusY],
        fillColor: "black"
    });

    outline.name = "outlineShape";
    outline.strokeColor = new Color("black");

    const result = new Group([outline, contentHolder]);
    return result;
}

// This function returns an ellipse whose vertices/co-vertices are always a fixed distance away from the content element.
// This is helpful because if one edge of the content element moves, only the corresponding edge of the ellipse will move.
// (If you scaled the ellipse, two edges of the ellipse would move)
//
// One downside is that you can't make the ellipse vertex any closer to the content edge,
// but while the scaledEllipse version does allow movement, it's not a very controllable or reliable thing
export function makeFixedEllipseBubble(bubble: Bubble): Item {
    const contentHolder = bubble.getDefaultContentHolder();
    const contentBounds = contentHolder.bounds!;

    // Keep constant the distance between content edge and vertex.
    // What do we set it to? Well, let's choose to set it to the same as the distance on a default-sized content element.
    const defaultContentSize = new Size(140, 28);
    // This defaultEllipseRadii value was determined by adding console logging to makeScaledEllipseBubble()
    // and letting it run on a default-sized content element.
    const defaultEllipseRadii = new Size(95.1841342516191, 22.136458629005705);
    const delta = defaultEllipseRadii.subtract(defaultContentSize.divide(2));

    const ellipseTopLeft = contentBounds.topLeft!.subtract(new Point(delta));
    const radius = contentBounds.center!.subtract(ellipseTopLeft);

    const outline = new Path.Ellipse({
        center: [contentBounds.center!.x!, contentBounds.center!.y!],
        radius: [radius.x!, radius.y!],
        fillColor: "black"
    });

    outline.name = "outlineShape";
    outline.strokeColor = new Color("black");

    const result = new Group([outline, contentHolder]);
    return result;
}
