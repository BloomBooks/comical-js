import { Point, Color, Item, Shape, project, Layer } from "paper";
import { BubbleSpec, TailSpec, BubbleSpecPattern } from "bubbleSpec";
import Comical from "./comical";
import { Tail } from "./tail";

// This class represents a bubble (including the tails, if any) wrapped around an HTML element
// and handles:
// - storing and retrieving the BubbleSpec that represents the persistent state of
// the Bubble from the element's data-bubble attribute;
// - creating paper.js shapes representing the bubble and tails
// - positioning and sizing those shapes based on the position and size of the wrapped element
// - automatically repositioning them when the wrapped element changes
// - creating handles on the tails to allow the user to drag them, and updating
// the data-bubble as well as the paper.js shapes when this happens
// - allowing the Bubble to be dragged, and updating the wrapped element's position (ToDo)
export default class Bubble {
  // The element to wrap with a bubble
  public content: HTMLElement;
  // Represents the state which is persisted into
  // It is private because we want to try to ensure that callers go through the saveBubbleSpec() setter method,
  // because it's important that changes here get persisted not just in this instance's memory but additionally to the HTML as well.
  private spec: BubbleSpec;
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
  // The tail objects (which include things like its PaperJs underlying objects and how to draw them).
  // Contains more details than the "tips" array in the spec object
  // The elements in each array should correspond, though.
  private tails: Tail[] = [];
  private observer: MutationObserver | undefined;
  private hScale: number = 1; // Horizontal scaling
  private vScale: number = 1; // Vertical scaling

  // The PaperJS layers in which to draw various pieces of the bubble into.
  private lowerLayer: Layer;
  private upperLayer: Layer;
  private handleLayer: Layer;

  public constructor(element: HTMLElement) {
    this.content = element;

    this.spec = Bubble.getBubbleSpec(this.content);
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
    style?: string
  ): BubbleSpec {
    if (!style || style == "none") {
      return {
        version: Comical.bubbleVersion,
        style: "none",
        tails: [],
        level: 1
      };
    }
    return {
      version: Comical.bubbleVersion,
      style: style,
      tails: [Bubble.makeDefaultTail(element)],
      level: 1
    };
  }

  //
  // Getter methods for various things saved in the spec field. They are Getters() so that consumers of this class will be encouraged to save them using getters/setters
  // because we probably need persistBubbleSpec() to be called afterward
  //

  // Gets the level (z-index) of this object
  public getSpecLevel(): number | undefined {
    return this.spec.level;
  }

  public getFullSpec(): BubbleSpec {
    const parents = Comical.findParents(this);
    if (parents.length == 0) {
      return this.spec;
    }
    const parent: Bubble = parents[0];
    // We probably don't need to be this careful, since functions that want
    // this bubble's tails or order go to its own spec. But these are
    // things that should NOT be inherited from parent, so let's get them right.
    const result: BubbleSpec = { ...parent.spec, tails: this.spec.tails };
    if (this.spec.hasOwnProperty("order")) {
      result.order = this.spec.order;
    } else {
      delete result.order;
    }
    return result;
  }

  // ENHANCE: Add more getters and setters, as they are needed

  // Returns the spec object. If you modify this object, make sure to use the setter to set the value again or use persistBubbleSpec() in order to get the changes to persist!
  public getBubbleSpec() {
    return this.spec;
  }

  // Setter for the spec field. Also persists the data into the HTML of the content element.
  public setBubbleSpec(spec: BubbleSpec): void {
    console.assert(
      !!(spec.version && spec.level && spec.tails && spec.style),
      "Bubble lacks minimum fields"
    );

    this.spec = spec;
    this.persistBubbleSpec();
  }

  public persistBubbleSpecWithoutMonitoring() {
    this.callWithMonitoringDisabled(() => {
      this.persistBubbleSpec();
    });
  }

  // Persists the data into the content element's HTML. Should be called after making changes to the underlying spec object.
  public persistBubbleSpec(): void {
    const json = JSON.stringify(this.spec);
    const escapedJson = json.replace(/"/g, "`");
    this.content.setAttribute("data-bubble", escapedJson);
  }

  public mergeWithNewBubbleProps(newBubbleProps: BubbleSpecPattern): void {
    // Figure out a default that will supply any necessary properties not
    // specified in data, including a tail in a default position
    const defaultData = Bubble.getDefaultBubbleSpec(
      this.content,
      newBubbleProps.style
    );

    const oldData: BubbleSpec = this.spec;

    // We get the default bubble for this style and parent to provide
    // any properties that have never before occurred for this bubble,
    // particularly a default tail placement if it was previously 'none'.
    // Any values already in oldData override these; for example, if
    // this bubble has ever had a tail, we'll keep its last known position.
    // Finally, any values present in data override anything else.
    const mergedBubble = {
      ...defaultData,
      ...oldData,
      ...(newBubbleProps as BubbleSpec)
    };

    this.setBubbleSpec(mergedBubble);
  }

  public getStyle(): string {
    return this.getFullSpec().style;
  }
  public setStyle(style: string): void {
    // TODO: Consider validating
    this.spec.style = style;
    this.persistBubbleSpec();
  }

  public setLayers(
    newLowerLayer: Layer,
    newUpperLayer: Layer,
    newHandleLayer: Layer
  ): void {
    this.setLowerLayer(newLowerLayer);
    this.setUpperLayer(newUpperLayer);
    this.setHandleLayer(newHandleLayer);
  }

  public getLowerLayer(): Layer {
    return this.lowerLayer;
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
      this.lowerLayer = new Layer(); // Note that the constructor automatically adds the newly-created layer to the project
    }
    if (!this.upperLayer) {
      this.upperLayer = new Layer();
    }
    if (!this.handleLayer) {
      this.handleLayer = new Layer();
    }
  }

  // The root method to call to cause this object to draw itself
  public makeShapes() {
    this.initializeLayers();

    // To keep things clean we discard old tails before we start.
    for (let i = 0; i < this.tails.length; ++i) {
      // Erase it off the current canvas
      this.tails[i].remove();
    }
    this.tails = [];

    // Make the bubble part of the bubble+tail
    this.loadShapeAsync(this.getStyle(), (newlyLoadedShape: Shape) => {
      this.wrapShapeAroundDiv(newlyLoadedShape);
    }); // Note: Make sure to use arrow functions to ensure that "this" refers to the right thing.

    // Make any tails the bubble should have
    this.spec.tails.forEach(tail => {
      this.makeTail(tail);
    });

    this.monitorContent();
  }

  // Returns the SVG contents string corresponding to the specified input bubble style
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

  // Loads the shape corresponding to the specified bubbleStyle, and calls the onShapeLoadeed() callback once the shape is finished loading (passing it in as the Shape parameter)
  private loadShapeAsync(
    bubbleStyle: string,
    onShapeLoaded: (s: Shape) => void
  ) {
    const svg = Bubble.getShapeSvgString(bubbleStyle);

    this.lowerLayer.activate(); // Sets this bubble's lowerLayer as the active layer, so that the SVG will be imported into the correct layer.

    // ImportSVG may return asynchronously if the input string is a URL.
    // Even though the string we pass contains the svg contents directly (not a URL), when I ran it in Bloom I still got a null shape out as the return value, so best to treat it as async.
    project!.importSVG(svg, {
      onLoad: (item: Item) => {
        onShapeLoaded(item as Shape);
      }
    });
  }

  // Attaches the specified shape to this object's content element
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

    this.contentHolder.strokeWidth = 0;
    this.innerShape = shape.clone({ insert: false }) as Shape;
    this.innerShape.onClick = () => {
      Comical.activateBubble(this);
    };
    this.upperLayer.addChild(this.innerShape);

    this.innerShape.strokeWidth = 0; // No outline
    this.innerShape.scale(0.99); // Make the top layer (which has no outline) slightly smaller (to prevent the upper fill layer from encroaching on the outline from the lower layer

    this.innerShape.fillColor = this.getBackgroundColor();
    this.adjustSizeAndPosition();
  }

  public getBackgroundColor(): Color {
    const spec = this.getFullSpec();
    // enhance: we want to do gradients if the spec calls for it by having more than one color.
    // Issue: sharing the gradation process with any tails (and maybe
    // other bubbles in family??)
    if (spec.backgroundColors && spec.backgroundColors.length) {
      return new Color(spec.backgroundColors[0]);
    }
    return Comical.backColor;
  }

  // Adjusts the size and position of the shapes/tails to match the content element
  adjustSizeAndPosition() {
    var contentWidth = -1;
    var contentHeight = -1;

    if (this.content) {
      contentWidth = this.content.offsetWidth;
      contentHeight = this.content.offsetHeight;
    }
    if (contentWidth < 1 || contentHeight < 1) {
      // Horrible kludge until I can find an event that fires when the object is ready.
      window.setTimeout(() => {
        this.adjustSizeAndPosition();
      }, 100);
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
    this.tails.forEach(tail => {
      tail.adjustRoot(contentCenter);
    });
    // Now, look for a child whose joiner should be our center, and adjust that.
    const child = Comical.findChild(this);
    if (child) {
      child.adjustJoiners(contentCenter);
    }
  }

  private adjustJoiners(newTip: Point): void {
    this.tails.forEach((tail: Tail) => {
      if (tail.spec.joiner && tail.adjustTip(newTip)) {
        this.persistBubbleSpecWithoutMonitoring();
      }
    });
  }

  // Disables monitoring, executes the callback, then returns monitoring back to its previous state
  private callWithMonitoringDisabled(callback: () => void) {
    const wasMonitoring = !!this.observer;
    this.stopMonitoring();

    callback();

    if (wasMonitoring) {
      this.monitorContent();
    }
  }

  public stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }

  // Monitors for changes to the content element, and update this object if the content element is updated
  monitorContent() {
    this.observer = new MutationObserver(() => this.adjustSizeAndPosition());
    this.observer.observe(this.content, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true
    });
  }

  // A callback for after the shape is loaded/place.
  // Figures out the information for the tail, then draws the shape and tail
  private makeTail(desiredTail: TailSpec) {
    if (this.spec.style === "none") {
      return;
    }

    const tipPoint = new Point(desiredTail.tipX, desiredTail.tipY);
    const midPoint = new Point(desiredTail.midpointX, desiredTail.midpointY);
    let startPoint = this.calculateTailStartPoint();

    this.upperLayer.activate();
    let tail = new Tail(
      startPoint,
      tipPoint,
      midPoint,
      this.lowerLayer,
      this.upperLayer,
      this.handleLayer,
      desiredTail,
      this
    );
    tail.onClick(() => {
      Comical.activateBubble(this);
    });

    // keep track of the Tail shapes; eventually adjustSize will adjust its start position.
    this.tails.push(tail);
  }

  public showHandles() {
    this.tails.forEach((tail: Tail) => {
      tail.showHandles();
    });
  }

  public calculateTailStartPoint(): Point {
    return new Point(
      this.content.offsetLeft + this.content.offsetWidth / 2,
      this.content.offsetTop + this.content.offsetHeight / 2
    );
  }

  public static makeDefaultTail(targetDiv: HTMLElement): TailSpec {
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
    const result: TailSpec = {
      tipX: targetX,
      tipY: targetY,
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

  // The SVG contents of a round speech bubble
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

  // The SVG contents of a shout bubble (jagged / exploding segments coming out)
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
