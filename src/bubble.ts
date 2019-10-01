import { Path, Point, Color, ToolEvent, Item, Shape, project, Layer } from "paper";
import { BubbleSpec, Tip } from "bubbleSpec";
import Comical from "./comical";
import { Tail } from "./tail";

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
  // the main shape of the bubble, including its border
  private shape: Shape;
  // a clone of shape with no border and an appropriate fill; drawn after all shapes
  // to fill them in and erase any overlapping borders.
  private innerShape: Shape;
    // contentHolder is a shape which is a required part of an SVG object used as
    // a bubble. It should be a rectangle in the SVG; it comes out as a Shape
    // when the SVG is converted to a paper.js object.
    // (We can also cause it to come out as a Path, by setting expandShapes: true
    // in the getItem options).
    // It has property size, with height, width as numbers matching the
    // height and width specified in the SVG for the rectangle.)
    // Also position, which surprisingly is about 50,50...probably a center.
    // It is identified by having id="contentHolder". The bubble shape gets stretched
    // and positioned so this rectangle corresponds to the element that the
    // bubble is wrapping.
  private contentHolder: Item;
  private tails: Tail[] = [];
  private observer: MutationObserver |undefined;
  private hScale: number = 1;
  private vScale: number = 1;

  private lowerLayer: Layer;
  private upperLayer: Layer;
  private handleLayer: Layer;

  // Don't use new() to create Bubble elements. Use getInstance() instead.
  // The reason why is because if multiple Bubble objects get created which correspond to the same element, they will have different member variables
  // (e.g. different spec variables). If multiple objects are allowed, then a lot more flushing changes and re-reading the HTML will be required to keep them in sync.
  // Instead, if we assume that only one instance is passed out per element, the code is much simpler.
  private constructor(element: HTMLElement) {
    this.content = element;

    this.spec = Bubble.getBubbleSpec(this.content);
  }

  private static knownInstances: [HTMLElement, Bubble][] = [];

  // Gets an existing Bubble instance corresponding to the element if available,
  // or creates a new instance if necessary
  public static getInstance(element: HTMLElement): Bubble {
    let bubble: Bubble | undefined = undefined;
    for (let i = 0; i < this.knownInstances.length; ++i) {
      // Check for same reference
      if (element === this.knownInstances[i][0]) {
        bubble = this.knownInstances[i][1];
      }
    }

    if (bubble == undefined) {
      bubble = new Bubble(element); // This function is the only place where new Bubble() should be called, in order to enforce only 1 Bubble instance per HTMLElement
      this.knownInstances.push([element, bubble]);
    }

    return bubble;
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

  public setLayers(newLowerLayer: Layer, newUpperLayer: Layer, newHandleLayer: Layer): void {
    this.setLowerLayer(newLowerLayer);
    this.setUpperLayer(newUpperLayer);
    this.setHandleLayer(newHandleLayer);
  }

  // Sets the value of lowerLayer. The "outline" shapes are drawn in the lower layer.
  public setLowerLayer(layer: Layer): void {
    this.lowerLayer = layer;
  }

  public getUpperLayer(): Layer {
    return this.upperLayer;
  }

  // Sets the value of upperLayer. The "fill" shapes are drawn in the upper layer.
  public setUpperLayer(layer: Layer): void {
    this.upperLayer = layer;
  }

  // The layer containing the tip and midpoint curve handles
  public setHandleLayer(layer: Layer): void {
    this.handleLayer = layer;
  }
  
  // Ensures that this bubble has all the required layers and creates them, if necessary
  private initializeLayers(): void {
    if (!this.lowerLayer) {
      this.lowerLayer = new Layer();  // Note that the constructor automatically adds the newly-created layer to the project
    }
    if (!this.upperLayer) {
      this.upperLayer = new Layer();
    }
    if (!this.handleLayer) {
      this.handleLayer = new Layer();
    }
  }

  public makeShapes() {
    this.initializeLayers();
    // Because we reuse Bubbles, from one call to convertBubbleJsonToCanvas to another,
    // a reused bubble might have some tails already, from last time. At one point, as wrapShapeAroundDiv
    // calls adjustSize, the attempt to adjust the old tails copied parts of them into the new canvas.
    // To keep things clean we must discard them before we start.
    for (let i = 0; i < this.tails.length; ++i) {
      // Erase it off the current canvas
      this.tails[i].remove();
    }
    this.tails = [];

    this.loadShapeAsync(this.getStyle(), (newlyLoadedShape: Shape) => {
      this.wrapShapeAroundDiv(newlyLoadedShape);
    }); // Note: Make sure to use arrow functions to ensure that "this" refers to the right thing.
    
    // Make any tails the bubble should have
    this.spec.tips.forEach(tail => {
      this.drawTailAfterShapePlaced(tail);
    });

    this.monitorContent();
  }

  public stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }

  monitorContent() {
    this.observer = new MutationObserver(() => this.adjustSize());
    this.observer.observe(this.content, {attributes: true, characterData: true, childList:true, subtree:true});
  }

  private wrapShapeAroundDiv(shape: Shape) {
    this.shape = shape;
    this.hScale = this.vScale = 1; // haven't scaled it at all yet.
    // recursive: true is required to see any but the root "g" element
    // (apparently contrary to documentation).
    // The 'name' of a paper item corresponds to the 'id' of an element in the SVG
    this.contentHolder = this.shape.getItem({
      recursive: true,
      match: (x: any) => {
        return x.name === "content-holder";
      }
    });

    //this.contentHolder.fillColor = new Color("cyan");
    this.contentHolder.strokeWidth = 0;
    this.innerShape = shape.clone() as Shape;
    this.innerShape.remove(); // Removes it from the current (lower) layer.
    this.upperLayer.addChild(this.innerShape);

    //this.innerShape.bringToFront();
    this.innerShape.fillColor = Comical.backColor;
    this.adjustSize();
    //window.addEventListener('load', adjustSize);

    //var topContent = content.offsetTop;
  }

  adjustSize() {
    var contentWidth = -1
    var contentHeight = -1;

    if (this.content) {
      contentWidth = this.content.offsetWidth;
      contentHeight = this.content.offsetHeight;
    }
    if (contentWidth < 1 || contentHeight < 1) {
      // Horrible kludge until I can find an event that fires when the object is ready.
      window.setTimeout(() => { this.adjustSize(); }, 100);
      return;
    }
    var holderWidth = (this.contentHolder as any).size.width;
    var holderHeight = (this.contentHolder as any).size.height;
    const desiredHScale = contentWidth / holderWidth;
    const desiredVScale = contentHeight / holderHeight;
    const scaleXBy = desiredHScale / this.hScale;
    const scaleYBy = desiredVScale / this.vScale;
    this.shape.scale(scaleXBy, scaleYBy);
    this.innerShape.scale(scaleXBy, scaleYBy);
    this.hScale = desiredHScale;
    this.vScale = desiredVScale;
    const contentLeft = this.content.offsetLeft;
    const contentTop = this.content.offsetTop;
    const contentCenter = new Point(
      contentLeft + contentWidth / 2,
      contentTop + contentHeight / 2
    );
    this.shape.position = contentCenter;
    this.innerShape.position = contentCenter;
    // Enhance: I think we could extract from this a method updateTailSpec
    // which loops over all the tails and if any tail's spec doesn't match the tail,
    // it turns off the mutation observer while updating the spec to match.
    // Such a method would be useful for updating the spec when the tail is dragged,
    // and perhaps for other things.
    let tailChanged = false;
    this.tails.forEach((tail, index) => {
      if (tail.adjustRoot(contentCenter)) {
        const tip = this.spec.tips[index];
        tip.midpointX = tail.mid.x!;
        tip.midpointY = tail.mid.y!;
        tailChanged = true;
      }
    });
    if (tailChanged) {
      // if no tail changed we MUST NOT modify the element,
      // as doing so will trigger the mutation observer.
      // Even if it did, we don't want to trigger a recursive call.
      const wasMonitoring = !!this.observer;
      this.stopMonitoring();
      this.setBubbleSpec(this.spec);
      if (wasMonitoring){
        this.monitorContent();
      }
    }
  };

  // A callback for after the shape is loaded/place.
  // Figures out the information for the tail, then draws the shape and tail
  private drawTailAfterShapePlaced(desiredTip: Tip) {
    if (this.spec.style === "none") {
      return;
    }

    const target = new Point(desiredTip.targetX, desiredTip.targetY);
    const mid = new Point(desiredTip.midpointX, desiredTip.midpointY);
    const start = new Point(this.content.offsetLeft + this.content.offsetWidth / 2,
      this.content.offsetTop + this.content.offsetHeight / 2);

    const tail = this.drawTail(start, mid, target,);
    // keep track of it; eventually adjustSize will adjust its start position.
    this.tails.push(tail);
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

  private loadShapeAsync(
    bubbleStyle: string,
    onShapeLoaded: (s: Shape) => void
  ) {
    const svg = Bubble.getShapeSvgString(bubbleStyle);

    this.lowerLayer.activate();  // Sets this bubble's lowerLayer as the active layer, so that the SVG will be imported into the correct layer.

    // ImportSVG may return asynchronously if the input string is a URL.
    // Even though the string we pass contains the svg contents directly (not a URL), when I ran it in Bloom I still got a null shape out as the return value, so best to treat it as async.
    project!.importSVG(svg, {
      onLoad: (item: Item) => {
        onShapeLoaded(item as Shape);
      }
    });
  }

  public drawTail(
    start: Point,
    mid: Point,
    tip: Point
  ): Tail {
    const tipHandle = this.makeHandle(tip);
    const curveHandle = this.makeHandle(mid);
    this.upperLayer.activate();
    let tail = new Tail(
      start,
      tipHandle.position!,
      curveHandle.position!,
      this.lowerLayer,
      this.upperLayer
    );
    tail.midHandle = curveHandle;

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
      
      tail.updatePoints(
        start,
        tipHandle.position!,
        curveHandle.position!
      );
      curveHandle.bringToFront();

      const newTip: Tip = {
        targetX: tipHandle!.position!.x!,
        targetY: tipHandle!.position!.y!,
        midpointX: curveHandle!.position!.x!,
        midpointY: curveHandle!.position!.y!
      };
      // todo: it isn't necessarily tip 0 that changed.
      // to fix: there's only one caller of this method, drawTailAfterShapePlaced, which has only one caller,
      // a loop in makeShapes() which is a foreach over the tips. Collapse that method and this into a single
      // method (makeTail would be a better name than either)
      // that takes the tip and tip index. Then use that index to know which tip to update.
      // Consider turning off the mutation observer while we update the bubble spec, as in adjustSize.
      this.spec.tips[0] = newTip; // enhance: for multiple tips, need to figure which one to update

      this.setBubbleSpec(this.spec);
    };
    tipHandle.onMouseUp = curveHandle.onMouseUp = () => {
      state = "idle";
    };
    return tail;
  }

  // TODO: Help? where should I be? I think this comes up with unique names.
  static handleIndex = 0;

  private makeHandle(tip: Point): Path.Circle {
    this.handleLayer.activate();
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
