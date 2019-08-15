import SVG from "svg.js";

export default class BubbleEdit {
    public static drawTail(div: HTMLElement):void {
        var draw = SVG(div).size(300,300);
        draw.rect(100, 100).attr({ fill: '#606' });
    }
}