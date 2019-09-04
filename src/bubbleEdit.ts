import {Path, Point, Color, Tool, ToolEvent, Item, Shape, project} from "paper";

export default class BubbleEdit {

    static backColor = new Color("yellow");

    public static drawTail(start: Point, tip: Point, lineBehind? : Item|null):void {
        const xmid = (start.x! + tip.x!)/2;
        const ymid = (start.y! + tip.y!)/2
        const deltaX = tip.x! - start.x!
        const deltaY = tip.y! - start.y!
        let mid = new Point(xmid - deltaY/10, ymid + deltaX/10);
        
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

    static handleIndex = 0;

    static makeHandle(tip: Point): Path.Circle {
        const result = new Path.Circle(tip, 10);
        result.strokeColor = new Color("blue");
        result.fillColor = new Color("white");
        result.name = "handle" + BubbleEdit.handleIndex++;
        return result;
    }

    // Given a list of shapes, which should initially have no stroke or fill color,
    // draws them twice, once with a black outline, then again filled with our
    // backColor. If the shapes overlap, this gives the effect of outlining the
    // combined shape. Then we draw the draggable tail on top, also with merged outline.
    public static drawTailOnShapes(start: Point, tip: Point, shapes: Item[]) {
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

    private static getShape(bubbleSpec: Shape|string, doWithShape: (s: Shape) => void) {
        if(typeof bubbleSpec !== "string") {
            doWithShape(bubbleSpec as Shape);
            return;
        }
        let svg: string = "";
        switch (bubbleSpec) {
            case "speech":
                svg = BubbleEdit.speechBubble();
                break;
            case "shout":
                svg = BubbleEdit.shoutBubble();
                break;
            default:
                console.log("unknown bubble type; using default");
                svg = BubbleEdit.speechBubble();
        }
        project!.importSVG(svg, {onLoad: (item:Item) => {
            doWithShape(item as Shape);
          }
        });      
    }

    public static wrapBubbleAroundDiv(bubbleSpec: Shape|string, content: HTMLElement, whenPlaced: (s:Shape) => void) {
        BubbleEdit.getShape(bubbleSpec, bubble =>
            BubbleEdit.wrapShapeAroundDiv(bubble, content, whenPlaced));
    }

    private static wrapShapeAroundDiv(bubble: Shape, content: HTMLElement, whenPlaced: (s:Shape) => void) {
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
      contentHolder.strokeWidth = 0;
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
        whenPlaced(bubble);
      }
      adjustSize();
      //window.addEventListener('load', adjustSize);

      //var topContent = content.offsetTop;

    }

    public static wrapBubbleAroundDivWithTail(bubbleSpec: Shape|string, content: HTMLElement) {
        BubbleEdit.wrapBubbleAroundDiv(bubbleSpec, content, (bubble:Shape) => {
            BubbleEdit.drawTailOnShapes(bubble!.position!, bubble!.position!.add(new Point(200,100)),[bubble])
        });
    }

    public static convertCanvasToSvgImg(parent: HTMLElement) {
        const canvas = parent.getElementsByTagName("canvas")[0];
        if (!canvas) {
            return;
        }
        // Remove drag handles
        project!.getItems({recursive: true, match:(x: any) => {
            return x.name && x.name.startsWith("handle");
          }}).forEach(x => x.remove());
        const svg = project!.exportSVG() as SVGElement;
        canvas.parentElement!.insertBefore(svg, canvas);
        canvas.remove();

    }

    public static speechBubble() {
        return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:cc="http://creativecommons.org/ns#"
         xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:svg="http://www.w3.org/2000/svg"
         xmlns="http://www.w3.org/2000/svg"
         id="svg8"
         version="1.1"
         viewBox="0 0 100 100"
         height="100mm"
         width="100mm">
        <defs
           id="defs2" />
        <metadata
           id="metadata5">
          <rdf:RDF>
            <cc:Work
               rdf:about="">
              <dc:format>image/svg+xml</dc:format>
              <dc:type
                 rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
              <dc:title></dc:title>
            </cc:Work>
          </rdf:RDF>
        </metadata>
        <g
           transform="translate(0,-197)"
           id="layer1">
          <ellipse
             ry="49.702854"
             rx="49.608364"
             cy="247.10715"
             cx="50.36533"
             id="path3715"
             style="fill:#ffffff;stroke:#000000;stroke-width:0.26660731;stroke-opacity:1" />
          <rect
            id="content-holder"
            class="content-holder"
             y="214.03423"
             x="13.229166"
             height="65.956848"
             width="74.461304"
             style="fill:none;stroke:#000000;stroke-width:0.26458332;stroke-opacity:1" />
        </g>
      </svg>`;
    }
    
      public static shoutBubble() {
        return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <svg
           xmlns:dc="http://purl.org/dc/elements/1.1/"
           xmlns:cc="http://creativecommons.org/ns#"
           xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
           xmlns:svg="http://www.w3.org/2000/svg"
           xmlns="http://www.w3.org/2000/svg"
           id="svg8"
           version="1.1"
           viewBox="0 0 100 100"
           height="100mm"
           width="100mm">
          <defs
             id="defs2" />
          <metadata
             id="metadata5">
            <rdf:RDF>
              <cc:Work
                 rdf:about="">
                <dc:format>image/svg+xml</dc:format>
                <dc:type
                   rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
                <dc:title></dc:title>
              </cc:Work>
            </rdf:RDF>
          </metadata>
          <g
             transform="translate(0,-197)"
             id="layer1">
             <path
             id="path4528"
             d="m 34.773809,223.10566 14.174107,-25.89137 12.662202,25.51339 21.92262,-25.13542 -6.199227,26.04296 19.050415,-5.82123 -18.898809,23.62351 22.489583,8.50447 -22.678569,13.60714 20.78869,31.56101 -39.498513,-24.94643 2.834823,21.73363 -17.386906,-21.73363 -17.575892,27.0253 0.566965,-27.0253 L 4.346726,290.00744 22.489583,258.44643 0.37797618,247.67411 22.867559,235.76786 1.7008928,199.29316 Z"
             style="fill:none;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" />
             <rect
             id="content-holder"
             y="223.63522"
             x="22.830175"
             height="46.376858"
             width="54.503334"
             style="fill:none;stroke:#000000;stroke-width:0.18981449;stroke-opacity:1;fill-opacity:0" />
          </g>
        </svg>`;
      }
}

// planned next steps
// 1. When we wrap a shape around an element, record the shape as the data-bubble attr.
// Tricks will be needed if it is an arbitrary SVG.
// 2. When a tail is attached or its key points moved, record tip and mid positions in data-tail-mid and data-tail-tip.
// 3. Add function ConvertSvgToCanvas(parent). Does more or less the opposite of ConvertCanvasToSvg,
// but using the data-X attributes of children of parent that have them to initialize the canvas paper elements.
// Enhance test code to make Finish button toggle between Save and Edit.
// (Once the logic to create a canvas as an overlay on a parent is in place, can probably get all the paper.js
// stuff out of the test code.)