import {Path, Point, Color, Tool, ToolEvent} from "paper";

export default class BubbleEdit {


    public static drawTail(start: Point, tip: Point):void {
        const path = new Path();
        path.strokeColor = new Color("black");
        
        path.moveTo(start);
        const xmid = (start.x! + tip.x!)/2;
        const ymid = (start.y! + tip.y!)/2
        let mid = new Point(xmid - ymid/5, ymid - xmid/5);

        const tipHandle = this.makeHandle(tip);
        const curveHandle = this.makeHandle(mid);
        this.makeTail(path, start, tipHandle.position!, curveHandle.position!);

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
                tipHandle.position = event.point;
            } else if (state === "dragCurve") {
                curveHandle.position = event.point;
            } else {
                return;
            }
            path.segments!.pop();
            path.segments!.pop();
            this.makeTail(path, start, tipHandle.position!, curveHandle.position!);
        }
        tool.onMouseUp = (event: ToolEvent) => {
                state = "idle";
        }
    }

    static makeTail(path: Path, root: Point, tip: Point, mid:Point) {
        path.removeSegments();
        const tailWidth = 50;
        const xdiff = tip.x! - root.x!;
        const ydiff = tip.y! - root.y!;
        // we want to make the base of the tail a line of length tailWidth
        // at right angles to the line from root to tip
        // centered at root.
        const angle = new Point(xdiff, ydiff).angle!;
        const delta = new Point(0,0);
        delta.angle = angle + 90;
        delta.length = tailWidth / 4;
        const begin = root.add(delta).add(delta);
        const end = root.subtract(delta).subtract(delta);
        const mid1 = mid.add(delta);
        const mid2 = mid.subtract(delta);
        path.moveTo(begin);
        path.lineTo(mid1);
        path.lineTo(tip);
        path.lineTo(mid2);
        path.lineTo(end);
        //path.smooth();
    }

    static makeHandle(tip: Point): Path.Circle {
        const result = new Path.Circle(tip, 10);
        result.strokeColor = new Color("blue");
        result.fillColor = new Color("white");
        return result;
    }
}