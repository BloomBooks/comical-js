import {Path, Point, Color, Tool, ToolEvent, Item, Shape} from "paper";

export default class BubbleEdit {

    static backColor = new Color("yellow");

    public static drawTail(start: Point, tip: Point, lineBehind? : Item|null):void {
        const xmid = (start.x! + tip.x!)/2;
        const ymid = (start.y! + tip.y!)/2
        let mid = new Point(xmid - ymid/5, ymid - xmid/5);

        const tipHandle = this.makeHandle(tip);
        const curveHandle = this.makeHandle(mid);
        let tails = this.makeTail(start, tipHandle.position!, curveHandle.position!, lineBehind);
        curveHandle.bringToFront();

        let state = "idle";

        const tool = new Tool();
        tool.onMouseDown = (event: ToolEvent) => {
            if (event.item === tipHandle)
            {
                state = "dragTip";
            } else if (event.item == curveHandle) {
                state = "dragCurve";
            }
        }
        tool.onMouseDrag = (event: ToolEvent) => {
            if (state === "dragTip") {
                const delta = event.point!.subtract(tipHandle.position!).divide(2);
                tipHandle.position = event.point;
                // moving the curve handle half as much is intended to keep
                // the curve roughly the same shape as the tip moves.
                // It might be more precise if we moved it a distance
                // proportional to how close it is to the tip to begin with.
                // Then again, we may decide to constrain it to stay
                // equidistant from the root and tip.
                curveHandle.position = curveHandle.position!.add(delta);
            } else if (state === "dragCurve") {
                curveHandle.position = event.point;
            } else {
                return;
            }
            tails.forEach(t => t.remove());
            tails = this.makeTail(start, tipHandle.position!, curveHandle.position!, lineBehind);
            curveHandle.bringToFront();
        }
        tool.onMouseUp = (event: ToolEvent) => {
                state = "idle";
        }
    }

    static makeTail(root: Point, tip: Point, mid:Point, lineBehind? : Item|null): Path[] {
        const tailWidth = 50;
        // we want to make the base of the tail a line of length tailWidth
        // at right angles to the line from root to mid
        // centered at root.
        const angleBase = new Point(mid.x! - root.x!, mid.y! - root.y!).angle!;
        const deltaBase = new Point(0,0);
        deltaBase.angle = angleBase + 90;
        deltaBase.length = tailWidth / 2;
        const begin = root.add(deltaBase);
        const end = root.subtract(deltaBase);

        // The midpoints of the arcs are a quarter base width either side of mid,
        // offset at right angles to the root/tip line.
        const angleMid = new Point(tip.x! - root.x!, tip.y! - root.y!).angle!;
        const deltaMid = new Point(0,0);
        deltaMid.angle = angleMid + 90;
        deltaMid.length = tailWidth / 4;
        const mid1 = mid.add(deltaMid);
        const mid2 = mid.subtract(deltaMid);

        const pathstroke = new Path.Arc(begin, mid1, tip);
        const pathArc2 = new Path.Arc(tip, mid2, end);
        pathstroke.addSegments(pathArc2.segments!);
        pathArc2.remove();
        const pathFill = pathstroke.clone() as Path;
        pathstroke.strokeColor = new Color("black");
        if (lineBehind) {
            pathstroke.insertBelow(lineBehind);
        }
        pathFill.fillColor = BubbleEdit.backColor;
        return [pathstroke, pathFill];
    }

    static makeHandle(tip: Point): Path.Circle {
        const result = new Path.Circle(tip, 10);
        result.strokeColor = new Color("blue");
        result.fillColor = new Color("white");
        return result;
    }

    // Given a list of shapes, which should initially have no stroke or fill color,
    // draws them twice, once with a black outline, then again filled with our
    // backColor. If the shapes overlap, this gives the effect of outlining the
    // combined shape. Then we draw the draggable tail on top, also with merged outline.
    public static drawTailOnShapes(start: Point, tip: Point, shapes: Path[]) {
        const interiors: Path[] = [];
        shapes.forEach(s => {
            var copy = s.clone() as Path;
            interiors.push(copy);
            copy.bringToFront(); // already in front of s, want in front of all
            copy.fillColor = BubbleEdit.backColor;
        })
        var stroke = new Color("black");
        shapes.forEach(s => s.strokeColor = stroke);
        BubbleEdit.drawTail(start, tip, interiors[0]);
    }

    public static wrapBubbleAroundDiv(bubble: Shape, content: HTMLElement) {
      // recursive: true is required to see any but the root "g" element
      // (apparently contrary to documentation).
      // The 'name' of a paper item corresponds to the 'id' of an element in the SVG
      const contentHolder = bubble.getItem({recursive: true, match:(x: any) => {
        return x.name ==="content-holder";
      }});
      // contentHolder (which should be a rectangle in SVG) comes out as a Shape.
      // (can also cause it to come out as a Path, by setting expandShapes: true
      // in the getItem options).
      // It has property size, with height, width as numbers matching the
      // height and width specified in the SVG for the rectangle.)
      // Also position, which surprisingly is about 50,50...probably a center.
      //contentHolder.fillColor = new Color("cyan");
      const adjustSize = () => {
        var contentWidth = content.offsetWidth;
        var contentHeight = content.offsetHeight;
        if (contentWidth < 1 || contentHeight < 1) {
            // Horrible kludge until I can find an event that fires when the object is ready.
            window.setTimeout(adjustSize, 100);
            return;
        }
        var holderWidth = (contentHolder as any).size.width;
        var holderHeight = (contentHolder as any).size.height;
        bubble.scale(contentWidth/holderWidth, contentHeight / holderHeight);
        const contentLeft = content.offsetLeft;
        const contentTop = content.offsetTop;
        const contentCenter = new Point(contentLeft + contentWidth/2, contentTop + contentHeight/2);
        bubble.position= contentCenter;
      }
      adjustSize();
      //window.addEventListener('load', adjustSize);

      //var topContent = content.offsetTop;

    }
}