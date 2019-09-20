import {
  Path,
  Point,
  Color,
  ToolEvent,
  Item,
  Shape,
  project,
  setup
} from "paper";

import { BubbleSpec, Tip } from "bubbleSpec";

export class Bubble {
  private backColor = new Color("white");
  private shapeWithoutTail: Shape;
  private bubbleScaleX: number;
  private bubbleScaleY: number;
  private bubbleSpec: BubbleSpec;
  private targetElement: HTMLElement; // The element that the speech bubble will wrap around
  // TODO: Probably an array of tails

  // TODO:
  // A constructor that takes in/assigns targetElement
  // setters
  // Method that instatiates the shapeWithoutTail that takes in style or the entire bubbleSpec

  public drawTail(
    start: Point,
    mid: Point,
    tip: Point,
    lineBehind?: Item | null
  ): void {
    const tipHandle = this.makeHandle(tip);
    const curveHandle = this.makeHandle(mid);
    let tails = this.makeTail(
      start,
      tipHandle.position!,
      curveHandle.position!,
      lineBehind
    );
    curveHandle.bringToFront();

    let state = "idle";
    tipHandle.onMouseDown = () => {
      state = "dragTip";
    };
    curveHandle.onMouseDown = () => {
      state = "dragCurve";
    };
    tipHandle.onMouseDrag = curveHandle.onMouseDrag = (event: ToolEvent) => {
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
      tails = this.makeTail(
        start,
        tipHandle.position!,
        curveHandle.position!,
        lineBehind
      );
      curveHandle.bringToFront();
      if (targetElement) {
        const bubble = Comical.getBubble(targetElement);
        const tip: Tip = {
          targetX: tipHandle!.position!.x!,
          targetY: tipHandle!.position!.y!,
          midpointX: curveHandle!.position!.x!,
          midpointY: curveHandle!.position!.y!
        };
        bubble.tips[0] = tip; // enhance: for multiple tips, need to figure which one to update
        Comical.setBubble(bubble, targetElement);
      }
    };
    tipHandle.onMouseUp = curveHandle.onMouseUp = () => {
      state = "idle";
    };
  }

  static defaultMid(start: Point, target: Point): Point {
    const xmid = (start.x! + target.x!) / 2;
    const ymid = (start.y! + target.y!) / 2;
    const deltaX = target.x! - start.x!;
    const deltaY = target.y! - start.y!;
    return new Point(xmid - deltaY / 10, ymid + deltaX / 10);
  }

  static makeTail(
    root: Point,
    tip: Point,
    mid: Point,
    lineBehind?: Item | null
  ): Path[] {
    const tailWidth = 25;
    // we want to make the base of the tail a line of length tailWidth
    // at right angles to the line from root to mid
    // centered at root.
    const angleBase = new Point(mid.x! - root.x!, mid.y! - root.y!).angle!;
    const deltaBase = new Point(0, 0);
    deltaBase.angle = angleBase + 90;
    deltaBase.length = tailWidth / 2;
    const begin = root.add(deltaBase);
    const end = root.subtract(deltaBase);

    // The midpoints of the arcs are a quarter base width either side of mid,
    // offset at right angles to the root/tip line.
    const angleMid = new Point(tip.x! - root.x!, tip.y! - root.y!).angle!;
    const deltaMid = new Point(0, 0);
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
    pathFill.fillColor = this.backColor;
    return [pathstroke, pathFill];
  }

  static handleIndex = 0;

  private makeHandle(tip: Point): Path.Circle {
    const result = new Path.Circle(tip, 8);
    result.strokeColor = new Color("aqua");
    result.strokeWidth = 2;
    result.fillColor = new Color("white");
    // We basically want the bubbles transparent, especially for the tip, so
    // you can see where the tip actually ends up. But if it's perfectly transparent,
    // paper.js doesn't register hit tests on the transparent part. So go for a very
    // small alpha.
    result.fillColor.alpha = 0.01;
    result.name = "handle" + Comical.handleIndex++;
    return result;
  }

  // Given a list of shapes, which should initially have no stroke or fill color,
  // draws them twice, once with a black outline, then again filled with our
  // backColor. If the shapes overlap, this gives the effect of outlining the
  // combined shape. Then we draw the draggable tail on top, also with merged outline.
  public drawTailOnShapes(
    start: Point,
    mid: Point,
    tip: Point,
    shapes: Item[]
  ) {
    const interiors: Path[] = [];
    shapes.forEach(s => {
      var copy = s.clone() as Path;
      interiors.push(copy);
      copy.bringToFront(); // already in front of s, want in front of all
      copy.fillColor = this.backColor;
    });
    var stroke = new Color("black");
    shapes.forEach(s => (s.strokeColor = stroke));
    this.drawTail(start, mid, tip, interiors[0]);
  }

  public wrapBubbleAroundDiv(
    bubbleStyle:  string,
    whenPlaced: (s: Shape) => void
  ) {
    this.getShape(bubbleStyle, bubble => {
      if (bubble) {
        bubble.strokeColor = new Color("transparent");
        this.wrapShapeAroundDiv(bubble, whenPlaced);
      }
    });
  }

  private getShape(
    bubbleStyle: string,
    doWithShape: (s: Shape) => void
  ) {
    let svg: string = "";
    switch (bubbleStyle) {
      case "speech":
        svg = Bubble.speechBubble();
        break;
      case "shout":
        svg = Bubble.shoutBubble();
        break;
      case "none":
        break;
      default:
        console.log("unknown bubble type; using default");
        svg = speechBubble();
    }
    project!.importSVG(svg, {
      onLoad: (item: Item) => {
        doWithShape(item as Shape);
      }
    });

  private wrapShapeAroundDiv(
    whenPlaced: (s: Shape) => void
  ) {
    // recursive: true is required to see any but the root "g" element
    // (apparently contrary to documentation).
    // The 'name' of a paper item corresponds to the 'id' of an element in the SVG
    const contentHolder = this.shapeWithoutTail.getItem({
      recursive: true,
      match: (x: any) => {
        return x.name === "content-holder";
      }
    });
    // contentHolder (which should be a rectangle in SVG) comes out as a Shape.
    // (can also cause it to come out as a Path, by setting expandShapes: true
    // in the getItem options).
    // It has property size, with height, width as numbers matching the
    // height and width specified in the SVG for the rectangle.)
    // Also position, which surprisingly is about 50,50...probably a center.
    //contentHolder.fillColor = new Color("cyan");
    contentHolder.strokeWidth = 0;
    // let bubbleScaleX = 1;
    // let bubbleScaleY = 1;
    // let firstTime = true;
    // const adjustSize = () => {
    //   console.log("adjustSize()");
    //   var contentWidth = this.targetElement.offsetWidth;
    //   var contentHeight = this.targetElement.offsetHeight;
    //   if (contentWidth < 1 || contentHeight < 1) {
    //     // Horrible kludge until I can find an event that fires when the object is ready.
    //     window.setTimeout(adjustSize, 100);
    //     return;
    //   }
    //   var holderWidth = (contentHolder as any).size.width;
    //   var holderHeight = (contentHolder as any).size.height;
    //   const xScale = contentWidth / holderWidth / bubbleScaleX;
    //   const yScale = contentHeight / holderHeight / bubbleScaleY;
    //   shapeWithoutTail.scale(xScale, yScale);
    //   bubbleScaleX *= xScale; // Keep track of the total bubble scaling factor manually
    //   bubbleScaleY *= yScale;
    //   const contentLeft = this.targetElement.offsetLeft;
    //   const contentTop = this.targetElement.offsetTop;
    //   const contentCenter = new Point(
    //     contentLeft + contentWidth / 2,
    //     contentTop + contentHeight / 2
    //   );
    //   shapeWithoutTail.position = contentCenter;
    //   if (firstTime) {
    //     whenPlaced(shapeWithoutTail);
    //     //firstTime = false;
    //   }
    // };
    adjustSize();

    // Try to refactor to get rid of this need
    whenPlaced(this.shapeWithoutTail);
    // TODO: Maybe just call whenPlaced() once here (after adjustSize()) instead of having the firstTime flag to check inside of adjustSize()

    // let oldBounds = this.targetElement.getBoundingClientRect();

    // TODO: Switch to MutationObserver instead of polling with setTimeout()

    // const monitorSize = () => {
    //   const newBounds = content.getBoundingClientRect();
    //   if (newBounds != oldBounds) {
    //     adjustSize();
    //   }
    //   window.setTimeout(monitorSize, 1000);
    // };
    // window.setTimeout(monitorSize, 1000);
    //window.addEventListener('load', adjustSize);

    //var topContent = content.offsetTop;
  }

  private adjustSize() {
    console.log("adjustSize()");
    var contentWidth = this.targetElement.offsetWidth;
    var contentHeight = this.targetElement.offsetHeight;
    if (contentWidth < 1 || contentHeight < 1) {
      // Horrible kludge until I can find an event that fires when the object is ready.
      window.setTimeout(adjustSize, 100);
      return;
    }
    var holderWidth = (contentHolder as any).size.width;
    var holderHeight = (contentHolder as any).size.height;
    const xScale = contentWidth / holderWidth / bubbleScaleX;
    const yScale = contentHeight / holderHeight / bubbleScaleY;
    bubble.scale(xScale, yScale);
    bubbleScaleX *= xScale; // Keep track of the total bubble scaling factor manually
    bubbleScaleY *= yScale;
    const contentLeft = this.targetElement.offsetLeft;
    const contentTop = this.targetElement.offsetTop;
    const contentCenter = new Point(
      contentLeft + contentWidth / 2,
      contentTop + contentHeight / 2
    );
    bubble.position = contentCenter;
  }

  public temp(content: HTMLElement) {
    const observer = new MutationObserver(mutations => {
      const matches = mutations.some(m => {
        if (m.target === content) {
          if (m.attributeName === "height") {
            adjustSize();
          }
        }
      });
    });
    observer.disconnect();
  }

  public static makeDefaultTip(targetDiv: HTMLElement): Tip {
    const parent: HTMLElement = targetDiv.parentElement as HTMLElement;
    const targetBox = targetDiv.getBoundingClientRect();
    const parentBox = parent.getBoundingClientRect();
    // center of targetbox relative to parent.
    const rootCenter = new Point(
      targetBox.left - parentBox.left + targetBox.width / 2,
      targetBox.top - parentBox.top + targetBox.height / 2
    );
    let targetX = targetBox.left - parentBox.left - targetBox.width / 2;
    if (targetBox.left - parentBox.left < parentBox.right - targetBox.right) {
      // box is closer to left than right...make the tail point right
      targetX = targetBox.right - parentBox.left + targetBox.width / 2;
    }
    let targetY = targetBox.bottom - parentBox.top + 20;
    if (targetY > parentBox.height - 5) {
      targetY = parentBox.height - 5;
    }
    if (targetY < targetBox.bottom - parentBox.top) {
      // try pointing up
      targetY = targetBox.top - parentBox.top - 20;
      if (targetY < 5) {
        targetY = 5;
      }
    }
    // Final checks: make sure the target is at least in the picture.
    if (targetX < 0) {
      targetX = 0;
    }
    if (targetX > parentBox.width) {
      targetX = parentBox.width;
    }
    if (targetY < 0) {
      targetY = 0;
    }
    if (targetY > parentBox.height) {
      targetY = parentBox.height;
    }
    const target = new Point(targetX, targetY);
    const mid: Point = Comical.defaultMid(rootCenter, target);
    const result: Tip = {
      targetX,
      targetY,
      midpointX: mid.x!,
      midpointY: mid.y!
    };
    return result;
  }

  public static wrapBubbleAroundDivWithTail(
    bubbleSpec: Shape | string,
    content: HTMLElement,
    desiredTip?: Tip
  ) {
    Comical.wrapBubbleAroundDiv(bubbleSpec, content, (bubble: Shape) => {
      let target = bubble!.position!.add(new Point(200, 100));
      let mid = Comical.defaultMid(bubble!.position!, target);
      if (desiredTip) {
        target = new Point(desiredTip.targetX, desiredTip.targetY);
        mid = new Point(desiredTip.midpointX, desiredTip.midpointY);
      }
      const tip: Tip = {
        targetX: target.x!,
        targetY: target.y!,
        midpointX: mid.x!,
        midpointY: mid.y!
      };
      if (typeof bubbleSpec === "string") {
        const bubble: BubbleSpec = {
          version: "1.0",
          style: (bubbleSpec as unknown) as string,
          tips: [tip],
          level: 1
        };
        Comical.setBubble(bubble, content);
      }
      Comical.drawTailOnShapes(
        bubble!.position!,
        mid,
        target,
        [bubble],
        content
      );
    });
  }

  public static getBubbleSpec(element: HTMLElement): BubbleSpec {
    const escapedJson = element.getAttribute("data-bubble");
    if (!escapedJson) {
      return Comical.getDefaultBubble(element, "none");
    }
    const json = escapedJson.replace(/`/g, '"');
    return JSON.parse(json); // enhance: can we usefully validate it?
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
