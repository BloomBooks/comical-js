import {
  Point,
  Color,
  Item,
  Shape,
  project,
  Layer,
  Gradient,
  GradientStop,
  Path,
  Rectangle,
  Group
} from "paper";
import { BubbleSpec, TailSpec, BubbleSpecPattern } from "bubbleSpec";
import { Comical } from "./comical";
import { Tail } from "./tail";
import { ArcTail } from "./arcTail";
import { StraightTail } from "./straightTail";
import { makeSpeechBubble } from "./speechBubble";

// This class represents a bubble (including the tails, if any) wrapped around an HTML element
// and handles:
// - storing and retrieving the BubbleSpec that represents the persistent state of
// the Bubble from the element's data-bubble attribute;
// - creating paper.js shapes (technically Items) representing the shapes of the bubble and tails
// - positioning and sizing those shapes based on the position and size of the wrapped element
// - automatically repositioning them when the wrapped element changes
// - creating handles on the tails to allow the user to drag them, and updating
// the data-bubble as well as the shapes when this happens
// - allowing the Bubble to be dragged, and updating the wrapped element's position (ToDo)
export class Bubble {
  // The element to wrap with a bubble
  public content: HTMLElement;
  public static defaultBorderWidth = 3;
  // Represents the state which is persisted into
  // It is private because we want to try to ensure that callers go through the saveBubbleSpec() setter method,
  // because it's important that changes here get persisted not just in this instance's memory but additionally to the HTML as well.
  private spec: BubbleSpec;
  // the main shape of the bubble, including its border. Although we think of this as a shape,
  // and it determines the shape of the bubble, it may not actually be a paper.js Shape.
  // When it's simply obtained from an svg, it's usually some kind of group.
  // When we extract a single outline from the svg (or eventually make one algorithmically),
  // it will most likely be a Path.
  public outline: Item;
  // If the item has a shadow, this makes it.
  // We would prefer to do this with the paper.js shadow properties applied to shape,
  // but experiment indicates that such shadows do not convert to SVG.
  private shadowShape: Item;
  // a clone of this.outline with no border and an appropriate fill; drawn after all outlines
  // to fill them in and erase any overlapping borders.
  public fillArea: Item;
  // contentHolder is a shape which is a required part of an SVG object used as
  // a bubble. It should be a rectangle in the SVG; it currently comes out as a Shape
  // when the SVG is converted to a paper.js object.
  // (We can also cause it to come out as a Path, by setting expandShapes: true
  // in the getItem options).
  // It has property size, with height, width as numbers matching the
  // height and width specified in the SVG for the rectangle.)
  // Also position, which surprisingly is about 50,50...probably a center.
  // It is identified by having id="contentHolder". The bubble shape gets stretched
  // and positioned so this rectangle corresponds to the element that the
  // bubble is wrapping.
  private contentHolder: Item | undefined;
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

  // true if we computed a shape for the bubble (in such a way that more than just
  // its size depends on the shape and size of the content element).
  private shapeIsComputed: boolean;
  // Remember the size of the content element when we last computed the bubble shape.
  oldContentWidth: number = 0;
  oldContentHeight: number = 0;

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
    if (!style || style === "none") {
      return {
        version: Comical.bubbleVersion,
        style: "none",
        tails: [],
        level: Comical.getMaxLevel() + 1
      };
    }
    const result: BubbleSpec = {
      version: Comical.bubbleVersion,
      style: style,
      tails: [Bubble.makeDefaultTail(element)],
      level: Comical.getMaxLevel() + 1
    };
    if (style === "caption") {
      result.backgroundColors = ["#FFFFFF", "#DFB28B"];
      result.tails = [];
      result.shadowOffset = 5;
    }
    return result;
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
    const parents = Comical.findAncestors(this);
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

  // Return true if the two arrays are equal (one level deep...items are ===)
  // Also if both are undefined.
  // This ought to be generic...arrays of any type...but I can't persuade Typescript
  // to allow it. For now I only need arrays of strings.
  private comparePossibleArrays(
    first: string[] | undefined,
    second: string[] | undefined
  ): boolean {
    if (!first && !second) {
      return true;
    }
    if (!first || !second) {
      return false;
    }
    if (first.length != second.length) {
      return false;
    }
    for (let i = 0; i < first.length; i++) {
      if (first[i] !== second[i]) {
        return false;
      }
    }
    return true;
  }

  public mergeWithNewBubbleProps(newBubbleProps: BubbleSpecPattern): void {
    // Figure out a default that will supply any necessary properties not
    // specified in data, including a tail in a default position.
    // In certain cases some of these properties may override values in
    // oldData (but never newBubbleProps).
    const newDefaultData = Bubble.getDefaultBubbleSpec(
      this.content,
      newBubbleProps.style
    );

    const oldData: BubbleSpec = this.spec;
    const oldDataOverrides: BubbleSpecPattern = {};

    if (oldData.style !== newBubbleProps.style) {
      // We will do some extra work to possibly switch other props
      // to their default values for the new style.

      // This gives the default properties associated with the OLD style
      const oldDefaultData = Bubble.getDefaultBubbleSpec(
        this.content,
        oldData.style
      );
      // For various properties, if oldData has the same value as oldDefaultData
      // (that is, the property in the current bubble is unchanged from
      // the default for the old style), we will update that property to the
      // default for the new style.
      if (oldData.tails.length === oldDefaultData.tails.length) {
        // nothing has changed the number of tails, so we want the new spec to
        // have the default number for its style. First, we keep as many tails
        // as are wanted and present (currently always zero or one)
        oldDataOverrides.tails = oldData.tails.slice(
          0,
          newDefaultData.tails.length
        );
        if (oldDataOverrides.tails.length < newDefaultData.tails.length) {
          // if we don't already have enough, add another one from defaultData
          // May need to do something fancier here one day if we might need to add more than
          // one. I don't think that's likely.
          oldDataOverrides.tails.push(newDefaultData.tails[0]);
        }
        // Enhance: If different bubble styles have different default tail styles,
        // we may want to consider forcing the style of the tail.
      }
      if (
        this.comparePossibleArrays(
          oldData.backgroundColors,
          oldDefaultData.backgroundColors
        )
      ) {
        oldDataOverrides.backgroundColors = newDefaultData.backgroundColors;
      }
      if (oldData.borderStyle === oldDefaultData.borderStyle) {
        oldDataOverrides.borderStyle = newDefaultData.borderStyle;
      }
      if (oldData.shadowOffset === oldDefaultData.shadowOffset) {
        oldDataOverrides.shadowOffset = newDefaultData.shadowOffset;
      }
      if (oldData.outerBorderColor === oldDefaultData.outerBorderColor) {
        oldDataOverrides.outerBorderColor = newDefaultData.outerBorderColor;
      }
    }

    // We get the default bubble for this style and parent to provide
    // any properties that have never before occurred for this bubble,
    // particularly a default tail placement if it was previously 'none'.
    // Any values already in oldData override these; for example, if
    // this bubble has ever had a tail, we'll keep its last known position.
    // If we put any values in oldDataOverrides (typically cases where we
    // prefer the defaultData value), they win next.
    // Finally, any values present in newBubbleProps override anything else.
    const mergedBubble = {
      ...newDefaultData,
      ...oldData,
      ...oldDataOverrides,
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

  // The root method to call to cause this object to make its shapes,
  // adjust their sizes to match the content,
  // and sets up monitoring so the shapes continue to adjust as the content
  // element size and position change.
  public initialize() {
    this.initializeLayers();

    // To keep things clean we discard old tails before we start.
    for (let i = 0; i < this.tails.length; ++i) {
      // Erase it off the current canvas
      this.tails[i].remove();
    }
    this.tails = [];

    // Make any tails the bubble should have
    this.spec.tails.forEach(tail => {
      this.makeTail(tail);
    });

    // Make the bubble part of the bubble+tail
    this.loadShapeAsync((newlyLoadedShape: Item) => {
      this.makeShapes(newlyLoadedShape);

      // Precondition: The tails must be initialized before this function is called
      this.adjustSizeAndPosition();
    });

    this.monitorContent();
  }

  // Returns the SVG contents string corresponding to the specified input bubble style
  public static getShapeSvgString(bubbleStyle: string): string {
    let svg: string = "";
    switch (bubbleStyle) {
      case "ellipse":
        svg = Bubble.ellipseBubble();
        break;
      case "shout":
        svg = Bubble.shoutBubble();
        break;
      case "caption":
        svg = Bubble.captionBubble();
        break;
      case "none":
        break;
      default:
        console.log("unknown bubble type; using default");
        svg = Bubble.ellipseBubble();
    }

    return svg;
  }

  // Get the main shape immediately if computed.
  // return undefined if the current bubble style is not a computed shape.
  private getComputedShape(): Item | undefined {
    if (this.content) {
      // remember the shape of the content from the most recent call.
      this.oldContentHeight = this.content.offsetHeight;
      this.oldContentWidth = this.content.offsetWidth;
    }
    const bubbleStyle = this.getStyle();
    this.lowerLayer.activate(); // at least for now, the main shape always goes in this layer.
    switch (bubbleStyle) {
      case "pointedArcs":
        return this.makePointedArcBubble();
      case "speech":
        return makeSpeechBubble(
          this.content.offsetWidth,
          this.content.offsetHeight,
          0.6,
          0.8
        );
      default:
        return undefined; // not a computed shape, may be svg...caller has real default
    }
  }

  // Loads the shape (technically Item) corresponding to the specified bubbleStyle,
  // and calls the onShapeLoadeed() callback once the shape is finished loading
  // (passing it in as the shape parameter)
  private loadShapeAsync(onShapeLoaded: (shape: Item) => void) {
    const bubbleStyle = this.getStyle();
    this.shapeIsComputed = false;
    var shape = this.getComputedShape();
    if (shape) {
      this.shapeIsComputed = true;
      onShapeLoaded(shape);
      return;
    }
    const svg = Bubble.getShapeSvgString(bubbleStyle);

    this.lowerLayer.activate(); // Sets this bubble's lowerLayer as the active layer, so that the SVG will be imported into the correct layer.

    // ImportSVG may return asynchronously if the input string is a URL.
    // Even though the string we pass contains the svg contents directly (not a URL), when I ran it in Bloom I still got a null shape out as the return value, so best to treat it as async.
    project!.importSVG(svg, {
      onLoad: (item: Item) => {
        onShapeLoaded(item);
      }
    });
  }

  // Attaches the specified shape to this object's content element
  private makeShapes(shape: Item) {
    var oldOutline = this.outline;
    var oldFillArea = this.fillArea;
    this.lowerLayer.activate();
    this.outline = shape;

    // if the SVG contains a single shape (marked with an ID) that is all
    // we need to draw, we can replace the whole-svg item with a path derived
    // from that one shape. Some benefits:
    // - paths painted with gradient colors convert correctly to SVG;
    // complex groups do not.
    // - simpler shape may help performance
    // - (future) it's possible to subtract one path from another, offering an
    // alternative way to hide overlapping line segments that is
    // compatible with bubbles having partly transparent fill colors.
    // Enhance: we could also look for a child, like the one in the shout
    // bubble, that is already a path, possibly by giving such elements
    // an outlinePath id. The only difference would be that the result from
    // getItem is already a path, so we don't need to cast it to shape and
    // call toPath().
    // If we add that, all our current bubbles can be converted to a single
    // path each. We may, however, not want to have the code assume that will
    // always be the case. For example, a bubble with a shadow or double outline
    // might not be doable with a single path.
    const outlineShape = shape.getItem({
      recursive: true,
      match: (x: any) => x.name === "outlineShape"
    });
    if (outlineShape) {
      shape.remove();
      this.outline = (outlineShape as Shape).toPath();
      this.lowerLayer.addChild(this.outline);
    }
    if (oldOutline) {
      this.outline.insertBelow(oldOutline);
      oldOutline.remove();
    }
    this.outline.strokeWidth = Bubble.defaultBorderWidth;
    this.hScale = this.vScale = 1; // haven't scaled it at all yet.
    // recursive: true is required to see any but the root "g" element
    // (apparently contrary to documentation).
    // The 'name' of a paper item corresponds to the 'id' of an element in the SVG
    this.contentHolder = shape.getItem({
      recursive: true,
      match: (x: any) => {
        return x.name === "content-holder";
      }
    });
    if (this.spec.shadowOffset) {
      if (this.shadowShape) {
        this.shadowShape.remove();
      }
      this.shadowShape = this.outline.clone({ deep: true });
      this.shadowShape.insertBelow(this.outline);
      this.shadowShape.fillColor = this.shadowShape.strokeColor;
    }

    this.contentHolder.strokeWidth = 0;
    this.fillArea = this.outline.clone({ insert: false });
    this.fillArea.onClick = () => {
      Comical.activateBubble(this);
    };

    // If we get rid of the stroke of the fill area, then it hides the outline
    // completely. Then we have to try to guess how much to shrink it so it
    // doesn't hide the outline. And if the outline border is thicker, we
    // have to shrink it more. Better to leave the border properties,
    // but make that part of the fill area transparent.
    this.fillArea.strokeColor = new Color("white");
    this.fillArea.strokeColor.alpha = 0;

    this.fillArea.fillColor = this.getBackgroundColor();

    if (oldFillArea) {
      this.fillArea.insertBelow(oldFillArea);
      oldFillArea.remove();
    } else {
      this.upperLayer.addChild(this.fillArea);
    }
  }

  public getBorderWidth() {
    return Bubble.defaultBorderWidth;
  }

  public getBackgroundColor(): Color {
    const spec = this.getFullSpec();
    // enhance: we want to do gradients if the spec calls for it by having more than one color.
    // Issue: sharing the gradation process with any tails (and maybe
    // other bubbles in family??)
    if (spec.backgroundColors && spec.backgroundColors.length) {
      // The checks for fillArea and bounds relate to the comment below in creating a gradient.
      if (
        spec.backgroundColors.length === 1 ||
        !this.fillArea ||
        !this.fillArea.bounds
      ) {
        return new Color(spec.backgroundColors[0]);
      }

      const gradient = new Gradient();
      const stops: GradientStop[] = [];
      spec.backgroundColors!.forEach(x =>
        stops.push(new GradientStop(new Color(x)))
      );
      gradient.stops = stops;

      // enhance: this is too dependent on fillArea being created, sized, and positioned before
      // backgroundColor is called for. It's not guaranteed, for example,
      // that fillArea is ready before tail shapes are made.
      // Thus, this is really only good enough for a single bubble, without tails:
      // although experimentally it seems to work with tails, there's no guarantee.
      // So, if somehow we don't have a fillArea or fillArea.bounds, we arrange
      // above to just return the first color.
      // But note, even if we have fillArea and fillArea.bounds,
      // we have no way to know whether it's already been sized and positioned in complex cases.
      // For linked bubbles, we need to either hide the part of the child tail
      // that is inside the parent (but using a differently positioned gradient),
      // or else use a single gradient for all the linked bubbles, which would
      // require finding all the siblings, determining an overall bounding rectangle,
      // and somehow making sure we don't use the background color until all the shapes are made.
      // Fortunately, our current needs only require gradients for single bubbles without tails.
      const gradientOrigin = this.fillArea.bounds.topCenter!;
      const gradientDestination = this.fillArea.bounds.bottomCenter!;

      const result: Color = new Color(
        gradient,
        gradientOrigin,
        gradientDestination
      );
      return result;
    }
    return Comical.backColor;
  }

  // Adjusts the size and position of the shapes/tails to match the content element
  adjustSizeAndPosition() {
    if (this.spec.style === "none") {
      // No need to adjust the bubble or anything because there isn't one.
      // (Also, if the style is none, then lots of subsequent variables could be undefined/missing/invalid)
      return;
    }

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
    if (
      this.shapeIsComputed &&
      Math.abs(contentWidth - this.oldContentWidth) +
        Math.abs(contentHeight - this.oldContentHeight) >
        0.001
    ) {
      const shape = this.getComputedShape()!;
      this.makeShapes(shape);
    }
    if (this.contentHolder) {
      var holderWidth = (this.contentHolder as any).size.width;
      var holderHeight = (this.contentHolder as any).size.height;
      const desiredHScale = contentWidth / holderWidth;
      const desiredVScale = contentHeight / holderHeight;
      const scaleXBy = desiredHScale / this.hScale;
      const scaleYBy = desiredVScale / this.vScale;
      this.outline.scale(scaleXBy, scaleYBy);
      if (this.shadowShape) {
        this.shadowShape.scale(scaleXBy, scaleYBy);
      }
      this.fillArea.scale(scaleXBy, scaleYBy);
      this.hScale = desiredHScale;
      this.vScale = desiredVScale;
    }
    const contentLeft = this.content.offsetLeft;
    const contentTop = this.content.offsetTop;
    const contentCenter = new Point(
      contentLeft + contentWidth / 2,
      contentTop + contentHeight / 2
    );
    this.outline.position = contentCenter;
    this.fillArea.position = contentCenter;
    if (this.shadowShape) {
      // We shouldn't have a shadowShape at all unless we have a shadowOffset.
      // In case somehow we do, hide the shadow completely when that offset is
      // falsy by putting it entirely behind the main shapes.
      this.shadowShape.position = this.outline.position.add(
        this.spec.shadowOffset || 0
      );
    }
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
      console.assert(child.tails.length <= 1, "A child may only have at most 1 tail.");
      
      // Note: I think it's better to adjust the joiners even if they would subsequently be hidden.
      //       This keeps the internal state looking more up-to-date and reasonable, even if it's invisible.
      //       However, it is also possible to only adjust the joiners if they are not overlapping
      child.adjustJoiners(contentCenter);

      const shouldTailsBeVisible = !this.isOverlapping(child);
      child.tails.forEach(tail => {
        tail.setTailAndHandleVisibility(shouldTailsBeVisible);
      });
    }

    const parent = Comical.findParent(this);
    if (parent) {
      // Need to check both child and parent, because even if we loaded the bubbles in a certain order, due to async nature, we can't be sure which one will be loaded first.
      // (This should only applicable to determining whether the tail is visible or not.
      // Don't think we need to adjust the joiners, they should all be loaded at that time.)
      const shouldTailsBeVisible = !this.isOverlapping(parent);
      
      console.assert(this.tails.length <= 1, "A child bubble may have at most 1 tail.");
      this.tails.forEach(tail => {
        tail.setTailAndHandleVisibility(shouldTailsBeVisible);
      });
    }
  }

  // Returns true if the bubbles overlap. Otherwise, returns false
  public isOverlapping(otherBubble: Bubble): boolean {
    if (!this.fillArea || !otherBubble.fillArea) {
      // If at least one of the bubbles doesn't have its shape (yet), we define this as being not overlapping
      return false;
    }

    const isIntersecting = this.fillArea.intersects(otherBubble.fillArea);
    if (isIntersecting) {
      // This is the standard case (at least if an overlap does exist) where this bubble's outline intersects the other's outline
      return true;
    } else {
      // TODO: Check pathological case where one bubble is entirely contained within the other
      return false;
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
    let tail: Tail;
    switch (desiredTail.style) {
      case "straight":
        tail = new StraightTail(
          startPoint,
          tipPoint,
          this.lowerLayer,
          this.upperLayer,
          this.handleLayer,
          desiredTail,
          this
        );
        break;
      case "arc":
      default:
        tail = new ArcTail(
          startPoint,
          tipPoint,
          midPoint,
          this.lowerLayer,
          this.upperLayer,
          this.handleLayer,
          desiredTail,
          this
        );
        break;
    }

    tail.makeShapes();
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

  // This is a helper method which, possibly with some enhancements,
  // should be useful for making a variety of computed bubble types.
  // It returns a Group containing a path and a content-holder rectangle
  // as makeShapes requires, given a function that makes a path from
  // an array of points and a center.
  // The content-holder rectangle is made the size of the content element
  // and placed at (borderWidth, borderWidth).
  // Then the array of points is constructed in an area of width borderWidth
  // around that rectangle, at least padWidth away from the inner rectangle.
  // They are roughly, but not exactly, equally spaced and the number of them
  // is proportional to the size of the content block.
  // Enhance: could provide some parameter to control the ratio between
  // the border length and the number of points.
  // Fix/enhance: for smaller blocks, the spacing may be a bit too irregular.
  // Fix/enhance: for larger blocks, the points nearest the four corners tend to be
  // too far apart, and the line between them may come inside the padding area.
  makeBubbleItem(
    borderWidth: number,
    padWidth: number,
    pathMaker: (points: Point[], center: Point) => Path
  ): Item {
    console.assert(
      padWidth < borderWidth,
      "padWidth is supposed to be an inner part of borderWidth and should be less than it."
    );
    const width = this.content.clientWidth;
    const height = this.content.clientHeight;
    // aiming for arcs ~40px long, but fewer than 5 would look weird.
    const computedArcCount = Math.round(((width + height) * 2) / 40);
    const arcCount = Math.max(computedArcCount, 5);
    const center = new Point(width / 2 + borderWidth, height / 2 + borderWidth);
    const contentHolder = new Shape.Rectangle(
      new Rectangle(borderWidth, borderWidth, width, height)
    );
    contentHolder.remove();
    contentHolder.name = "content-holder";
    const angleDelta = 360 / arcCount;
    const points: Point[] = [];
    const widthOfSpaceForPoints = borderWidth - padWidth;
    const heightOfSpaceForPoints = widthOfSpaceForPoints;
    for (let i = 0; i < arcCount; i++) {
      const delta = new Point(0, 0);
      delta.angle = angleDelta * i;
      delta.length = Math.max(center.x!, center.y!);
      // Without modification, adding delta to center would make a regular
      // polyhedron around the center.
      // We want the points outside the contentHolder rectangle and padWidth,
      // but closer to it as they get away from the center, putting the points on
      // a somewhat oval shape.
      // There's definitely room to enhance this algorithm!
      const isXInContentArea = Math.abs(delta.x!) <= width / 2;
      let isYInContentArea = Math.abs(delta.y!) <= height / 2;
      // Adjust the y value of delta so it is in the space above or below the
      // content box and its padding, unless the point is already in the area
      // left or right of the content. It seems to work better to make this
      // adjustment before we fiddle with the x coordinates.
      if (isXInContentArea || !isYInContentArea) {
        // point needs to be above or below the content box, but not outside
        // the content + borderWidth box. For a more nearly oval shape,
        // we put them along a slope from the center to the outside of the whole
        // shape. So the delta.y depends inversely on how far it is horizontally
        // from the center.
        const xDistanceFromCenter = Math.abs(delta.x!);
        const heightProportion = 1 - xDistanceFromCenter / width;
        const distanceFromText =
          heightOfSpaceForPoints * heightProportion + padWidth;
        delta.y = (height / 2 + distanceFromText) * (delta.y! > 0 ? 1 : -1);
      }
      isYInContentArea = Math.abs(delta.y!) <= height / 2; // update since we changed delta.y
      if (isYInContentArea || !isXInContentArea) {
        // point needs to be left or right of the box (but not TOO far from it).
        const yDistanceFromCenter = Math.abs(delta.y!);
        const widthProportion = 1 - yDistanceFromCenter / height;
        const distanceFromText =
          widthOfSpaceForPoints * widthProportion + padWidth;
        delta.x = (width / 2 + distanceFromText) * (delta.x! > 0 ? 1 : -1);
      }
      points.push(center.add(delta));
    }
    const outline = pathMaker(points, center);
    return new Group([outline, contentHolder]);
  }

  // Make a computed bubble shape by drawing an inward arc between each pair of points
  // in the array produced by makeBubbleItem.
  makePointedArcBubble(): Item {
    const borderWidth = 30;
    const arcDepth = 10;
    return this.makeBubbleItem(borderWidth, arcDepth, (points, center) => {
      const outline = new Path();
      for (let i = 0; i < points.length; i++) {
        const start = points[i];
        const end = i < points.length - 1 ? points[i + 1] : points[0];
        const mid = new Point((start.x! + end.x!) / 2, (start.y! + end.y!) / 2);
        const deltaCenter = mid.subtract(center);
        deltaCenter.length = arcDepth;
        const arcPoint = mid.subtract(deltaCenter);
        const arc = new Path.Arc(start, arcPoint, end);
        arc.remove();
        outline.addSegments(arc.segments!);
      }
      outline.strokeWidth = 1;
      outline.strokeColor = new Color("black");
      outline.closed = true; // It should already be, but may help paper.js to treat it so.
      return outline;
    });
  }

  // The SVG contents of a round (elliptical) bubble
  public static ellipseBubble() {
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
             id="outlineShape"
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

  public static captionBubble() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:cc="http://creativecommons.org/ns#"
         xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:svg="http://www.w3.org/2000/svg"
         xmlns="http://www.w3.org/2000/svg"
         id="svg8"
         version="1.1"
         viewBox="0 0 100 50"
         height="50mm"
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
            id="layer1">
          <rect
             y="2"
             x="2"
             height="46"
             width="96"
             id="outlineShape"
             style="fill:#ffffff;stroke:#000000;stroke-width:1;stroke-opacity:1" />
          <rect
            id="content-holder"
            class="content-holder"
             y="3"
             x="3"
             height="44"
             width="94"
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
