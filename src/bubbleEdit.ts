import {Path, Point, Color, Tool, ToolEvent} from "paper";

export default class BubbleEdit {


    public static drawTail():void {
        const path = new Path();
        path.strokeColor = new Color("black");
        const start = new Point(100,100);
        path.moveTo(start);
        const tip = start.add(new Point(200, -50));
        path.lineTo(tip);

        const tipHandle = new Path.Circle(tip, 10);
        tipHandle.strokeColor = new Color("blue");
        tipHandle.fillColor = new Color("white");

        let state = "idle";

        const tool = new Tool();
        tool.onMouseDown = (event: ToolEvent) => {
            if (event.item === tipHandle)
            {
                state = "dragTip";
            }
        }
        tool.onMouseDrag = (event: ToolEvent) => {
            if (state === "dragTip"){
                tipHandle.position = event.point;
                path.segments!.pop();
                path.moveTo(start);
                path.lineTo(event.point!);
            }
        }
        tool.onMouseUp = (event: ToolEvent) => {
                state = "idle";
        }
    }
}