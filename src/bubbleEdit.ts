import {Path, Point, Color, Tool, ToolEvent} from "paper";

export default class BubbleEdit {


    public static drawTail(start: Point, tip: Point):void {
        const xmid = (start.x! + tip.x!)/2;
        const ymid = (start.y! + tip.y!)/2
        let mid = new Point(xmid - ymid/5, ymid - xmid/5);

        const tipHandle = this.makeHandle(tip);
        const curveHandle = this.makeHandle(mid);
        let tail = this.makeTail(start, tipHandle.position!, curveHandle.position!);
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
            tail.remove();
            tail = this.makeTail(start, tipHandle.position!, curveHandle.position!);
            curveHandle.bringToFront();
        }
        tool.onMouseUp = (event: ToolEvent) => {
                state = "idle";
        }
    }

    static makeTail(root: Point, tip: Point, mid:Point): Path {
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

        const result = new Path.Arc(begin, mid1, tip);
        const path2 = new Path.Arc(tip, mid2, end);
        result.addSegments(path2.segments!);
        path2.remove();
        result.strokeColor = new Color("black");
        result.fillColor = new Color("yellow");
        return result;
    }

    static makeHandle(tip: Point): Path.Circle {
        const result = new Path.Circle(tip, 10);
        result.strokeColor = new Color("blue");
        result.fillColor = new Color("white");
        return result;
    }
}