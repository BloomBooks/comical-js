import { Path, Point, Color, ToolEvent, Item, Shape, project } from "paper";
import { BubbleSpec, Tip } from "bubbleSpec";
import Comical from "./comical";
import {Tail} from "./tail";

// This class represents a bubble (including the tails, if any) wrapped around an HTML element
// and handles
// - storing and retrieving the BubbleSpec that represents the persistent state of
// the Bubble from the element's data-bubble attribute;
// - creating paper.js shapes representing the bubble and tails
// - positioning and sizing those shapes based on the position and size of the wrapped element
// - automatically repostioning them when the wrapped element changes (ToDo)
// - creating handles on the tails to allow the user to drag them, and updating
// the data-bubble as well as the paper.js shapes when this happens
// - allowing the Bubble to be dragged, and updating the wrapped element's position (ToDo)
export default class Bubble {
  public content: HTMLElement;
  // TODO: What is the best name for "spec"?
  // TODO: This variable is dangerous. You dont' want people modifying this variable directly, cuz we need to persist the changes into bloom
  public spec: BubbleSpec;
  private shape: Shape;

  public constructor(element: HTMLElement) {
    this.content = element;

    this.spec = Bubble.getBubbleSpec(this.content);
  }

  public makeShapes() {
      if (this.spec.tips.length) {
        this.wrapBubbleWithTailAroundDiv(
          this.spec.style,
          this.spec.tips[0]
        );
      } else {
        this.wrapBubbleAroundDiv(this.spec.style);
      }
  }

  // Retrieves the bubble associated with the element
  public static getBubbleSpec(element: HTMLElement): BubbleSpec {
    const escapedJson = element.getAttribute("data-bubble");
    if (!escapedJson) {
      return Bubble.getDefaultBubbleSpec(element, "none");
    }
    const json = escapedJson.replace(/`/g, '"');
    return JSON.parse(json); // enhance: can we usefully validate it?
  }

  public static getDefaultBubbleSpec(
    element: HTMLElement,
    style: string
  ): BubbleSpec {
    if (!style || style == "none") {
      return {
        version: Comical.bubbleVersion,
        style: "none",
        tips: [],
        level: 1
      };
    }
    return {
      version: Comical.bubbleVersion,
      style: style,
      tips: [Bubble.makeDefaultTip(element)],
      level: 1
    };
  }

  // Links the bubbleShape with the content element
  public setBubbleSpec(spec: BubbleSpec): void {
    console.assert(
      !!(spec.version && spec.level && spec.tips && spec.style),
      "Bubble lacks minimum fields"
    );

    this.spec = spec;
    this.persistBubbleSpec();
  }

  protected persistBubbleSpec() {
    const json = JSON.stringify(this.spec);
    const escapedJson = json.replace(/"/g, "`");
    this.content.setAttribute("data-bubble", escapedJson);

    // TODO: Are there any conditions where we might want to remove the data-bubble attribute? It is kinda nice to have the tail information persist even if the style is set to "none"
  }

  public getStyle(): string {
    return this.spec.style;
  }
  public setStyle(style: string): void {
    // TODO: Consider validating
    this.spec.style = style;
    this.persistBubbleSpec();
  }

  public wrapBubbleAroundDiv(bubbleStyle: string) {
    this.wrapBubbleAndTailsAroundDiv(bubbleStyle, []);
  }

  public wrapBubbleWithTailAroundDiv(bubbleStyle: string, tail: Tip) {
    this.wrapBubbleAndTailsAroundDiv(bubbleStyle, [tail]);
  }

  public wrapBubbleAndTailsAroundDiv(
    bubbleStyle: string, // TODO: Instance var
    tails: Tip[]
  ) {
    this.spec.tips = tails;
    this.setStyle(bubbleStyle);
    Bubble.loadShape(this.getStyle(), (newlyLoadedShape: Shape) => {
      this.wrapShapeAroundDiv(newlyLoadedShape);
    }); // Note: Make sure to use arrow functions to ensure that "this" refers to the right thing.
  }

  private wrapShapeAroundDiv(shape: Shape) {
    this.shape = shape;
    // recursive: true is required to see any but the root "g" element
    // (apparently contrary to documentation).
    // The 'name' of a paper item corresponds to the 'id' of an element in the SVG
    const contentHolder = this.shape.getItem({
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
    const adjustSize = () => {
      var contentWidth = this.content.offsetWidth;
      var contentHeight = this.content.offsetHeight;
      if (contentWidth < 1 || contentHeight < 1) {
        // Horrible kludge until I can find an event that fires when the object is ready.
        window.setTimeout(adjustSize, 100);
        return;
      }
      var holderWidth = (contentHolder as any).size.width;
      var holderHeight = (contentHolder as any).size.height;
      this.shape.scale(
        contentWidth / holderWidth,
        contentHeight / holderHeight
      );
      const contentLeft = this.content.offsetLeft;
      const contentTop = this.content.offsetTop;
      const contentCenter = new Point(
        contentLeft + contentWidth / 2,
        contentTop + contentHeight / 2
      );
      this.shape.position = contentCenter;

      // Draw tails, if necessary
      if (this.spec.tips.length > 0) {
        this.spec.tips.forEach(tail => {
          this.drawTailAfterShapePlaced(tail);
        });
      }
    };
    adjustSize();
    //window.addEventListener('load', adjustSize);

    //var topContent = content.offsetTop;
  }

  // A callback for after the shape is loaded/place.
  // Figures out the information for the tail, then draws the shape and tail
  private drawTailAfterShapePlaced(desiredTip: Tip) {
    const target = new Point(desiredTip.targetX, desiredTip.targetY);
    const mid = new Point(desiredTip.midpointX, desiredTip.midpointY);

    // TODO: Is there something less awkward than creating a new spec object?
    const bubbleSpec: BubbleSpec = {
      version: "1.0",
      style: this.spec.style,
      tips: [desiredTip],
      level: 1
    };

    this.setBubbleSpec(bubbleSpec);

    this.drawTailOnShapes(
      mid,
      target,
      [this.shape]
    );
  }

  // Given a list of shapes, which should initially have no stroke or fill color,
  // draws them twice, once with a black outline, then again filled with our
  // backColor. If the shapes overlap, this gives the effect of outlining the
  // combined shape. Then we draw the draggable tail on top, also with merged outline.
  public drawTailOnShapes(
    mid: Point,
    tip: Point,
    shapes: Item[]
  ) {
    const start = this.shape.position!;
    const interiors: Path[] = [];
    shapes.forEach(s => {
      var copy = s.clone() as Path;
      interiors.push(copy);
      copy.bringToFront(); // already in front of s, want in front of all
      copy.fillColor = Comical.backColor;
    });
    var stroke = new Color("black");
    shapes.forEach(s => (s.strokeColor = stroke));
    this.drawTail(start, mid, tip, interiors[0]);
  }

  private static getShapeSvgString(bubbleStyle: string): string {
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
        svg = Bubble.speechBubble();
    }

    return svg;
  }

  private static loadShape(
    bubbleStyle: string,
    onShapeLoaded: (s: Shape) => void
  ) {
    const svg = Bubble.getShapeSvgString(bubbleStyle);
    project!.importSVG(svg, {
      onLoad: (item: Item) => {
        onShapeLoaded(item as Shape);
      }
    });
  }

  public drawTail(
    start: Point,
    mid: Point,
    tip: Point,
    lineBehind?: Item | null,
  ): void {
    const tipHandle = Bubble.makeHandle(tip);
    const curveHandle = Bubble.makeHandle(mid);
    let tail = new Tail(
      start,
      tipHandle.position!,
      curveHandle.position!,
    );
    if (lineBehind) {
      tail.putStrokeBehind(lineBehind);
    }
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
      
      const updatedTail = new Tail(
        start,
        tipHandle.position!,
        curveHandle.position!
      );
      tail.replaceWith(updatedTail);
      curveHandle.bringToFront();

      const newTip: Tip = {
        targetX: tipHandle!.position!.x!,
        targetY: tipHandle!.position!.y!,
        midpointX: curveHandle!.position!.x!,
        midpointY: curveHandle!.position!.y!
      };
      this.spec.tips[0] = newTip; // enhance: for multiple tips, need to figure which one to update

      this.setBubbleSpec(this.spec);
    };
    tipHandle.onMouseUp = curveHandle.onMouseUp = () => {
      state = "idle";
    };
  }

  // TODO: Help? where should I be? I think this comes up with unique names.
  static handleIndex = 0;

  static makeHandle(tip: Point): Path.Circle {
    const result = new Path.Circle(tip, 8);
    result.strokeColor = new Color("aqua");
    result.strokeWidth = 2;
    result.fillColor = new Color("white");
    // We basically want the bubbles transparent, especially for the tip, so
    // you can see where the tip actually ends up. But if it's perfectly transparent,
    // paper.js doesn't register hit tests on the transparent part. So go for a very
    // small alpha.
    result.fillColor.alpha = 0.01;
    result.name = "handle" + Bubble.handleIndex++;
    return result;
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
    const mid: Point = Bubble.defaultMid(rootCenter, target);
    const result: Tip = {
      targetX,
      targetY,
      midpointX: mid.x!,
      midpointY: mid.y!
    };
    return result;
  }

  static defaultMid(start: Point, target: Point): Point {
    const xmid = (start.x! + target.x!) / 2;
    const ymid = (start.y! + target.y!) / 2;
    const deltaX = target.x! - start.x!;
    const deltaY = target.y! - start.y!;
    return new Point(xmid - deltaY / 10, ymid + deltaX / 10);
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
