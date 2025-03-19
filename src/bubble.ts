import paper = require("paper");
import { BubbleSpec, TailSpec, BubbleSpecPattern } from "bubbleSpec";
import { Comical } from "./comical";
import { Tail } from "./tail";
import { ArcTail } from "./arcTail";
import { ThoughtTail } from "./thoughtTail";
import { LineTail } from "./lineTail";
import { makeSpeechBubble, makeSpeechBubbleParts } from "./speechBubble";
import { makeThoughtBubble } from "./thoughtBubble";
import { makeCaptionBox } from "./captionBubble";
import { activateLayer } from "./utilities";
import { SimpleRandom } from "./random";
import { makeCircleBubble } from "./circleBubble";

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
    public outline: paper.Item;
    // The original stroke color of the outline. In some modes, the actual outline color is changed.
    private oulineStrokeColor: paper.Color | null = null;
    // When possible, the shapes of all bubbles and their tails at the same level are combined
    // into this one shape, allowing a partly transparent background color without
    // extra strokes showing through. The combinedShape is stored on the parent of the
    // bubble family.
    public combinedShapes: paper.Item | undefined = undefined;
    // If the item has a shadow, this makes it.
    // We would prefer to do this with the paper.js shadow properties applied to shape,
    // but experiment indicates that such shadows do not convert to SVG.
    private shadowShape: paper.Item;
    // a clone of this.outline with no border and an appropriate fill; drawn on top of all outlines
    // to fill them in and erase any overlapping borders.
    // When possible, this is left undefined and combinedShapes is set up instead.
    public fillArea: paper.Item | undefined;
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
    private contentHolder: paper.Item | undefined;
    // The tail objects (which include things like its PaperJs underlying objects and how to draw them).
    // Contains more details than the "tips" array in the spec object
    // The elements in each array should correspond, though.
    public tails: Tail[] = [];
    private observer: MutationObserver | undefined;
    private hScale: number = 1; // Horizontal scaling
    private vScale: number = 1; // Vertical scaling

    // The PaperJS layers in which to draw various pieces of the bubble into.
    private lowerLayer: paper.Layer;
    private upperLayer: paper.Layer;
    private handleLayer: paper.Layer;

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

    // True if this bubble uses the old approach, hiding outline strokes behind a fillArea.
    // False if the outline shape is one we can combine using uniteShapes into a combinedShapes.
    public usingOverlay(): boolean {
        return !!this.fillArea;
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

    public static getDefaultBubbleSpec(element: HTMLElement, style?: string): BubbleSpec {
        if (!style || style === "none") {
            return {
                version: Comical.bubbleVersion,
                style: "none",
                tails: [],
                level: Comical.getMaxLevel(element) + 1,
                backgroundColors: ["transparent"],
                shadowOffset: 0,
                outerBorderColor: undefined
            };
        }
        const tailSpec = Bubble.makeDefaultTail(element);
        const result: BubbleSpec = {
            version: Comical.bubbleVersion,
            style: style,
            tails: [tailSpec],
            level: Comical.getMaxLevel(element) + 1
        };
        if (style === "caption") {
            result.backgroundColors = ["#FFFFFF", "#DFB28B"];
            result.tails = [];
            result.shadowOffset = 5;
        } else if (style === "pointedArcs" || style === "circle" || style === "rectangle") {
            result.tails = [];
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
        console.assert(!!(spec.version && spec.level && spec.tails && spec.style), "Bubble lacks minimum fields");

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
    private comparePossibleArrays(first: string[] | undefined, second: string[] | undefined): boolean {
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
        const newDefaultData = Bubble.getDefaultBubbleSpec(this.content, newBubbleProps.style || this.spec.style);

        const oldData: BubbleSpec = this.spec;
        const oldDataOverrides: BubbleSpecPattern = {};

        // If newBubbleProps doesn't have a style defined, that means we want to keep the existing
        // style. Therefore, "extra work" for "the new style" (below) doesn't apply.
        if (newBubbleProps.style && oldData.style !== newBubbleProps.style) {
            // We will do some extra work to possibly switch other props
            // to their default values for the new style.

            // This gives the default properties associated with the OLD style
            const oldDefaultData = Bubble.getDefaultBubbleSpec(this.content, oldData.style);
            // For various properties, if oldData has the same value as oldDefaultData
            // (that is, the property in the current bubble is unchanged from
            // the default for the old style), we will update that property to the
            // default for the new style.
            // When bubble styles that normally have tails have the tail turned off, at least oldData.tails
            // could be undefined here.
            if (oldData.tails && oldDefaultData.tails && oldData.tails.length === oldDefaultData.tails.length) {
                // nothing has changed the number of tails, so we want the new spec to
                // have the default number for its style. First, we keep as many tails
                // as are wanted and present (currently always zero or one)
                oldDataOverrides.tails = oldData.tails.slice(0, newDefaultData.tails.length);
                if (oldDataOverrides.tails.length < newDefaultData.tails.length) {
                    // if we don't already have enough, add another one from defaultData
                    // May need to do something fancier here one day if we might need to add more than
                    // one. I don't think that's likely.
                    oldDataOverrides.tails.push(newDefaultData.tails[0]);
                }
                // Enhance: If different bubble styles have different default tail styles,
                // we may want to consider forcing the style of the tail.
            }
            if (this.comparePossibleArrays(oldData.backgroundColors, oldDefaultData.backgroundColors)) {
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
        // particularly a default tail placement if it was previously "none".
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

    public setLayers(newLowerLayer: paper.Layer, newUpperLayer: paper.Layer, newHandleLayer: paper.Layer): void {
        this.setLowerLayer(newLowerLayer);
        this.setUpperLayer(newUpperLayer);
        this.setHandleLayer(newHandleLayer);
    }

    public getLowerLayer(): paper.Layer {
        return this.lowerLayer;
    }

    // Sets the value of lowerLayer. The "outline" shapes are drawn in the lower layer.
    public setLowerLayer(layer: paper.Layer): void {
        this.lowerLayer = layer;
    }

    public getUpperLayer(): paper.Layer {
        return this.upperLayer;
    }

    // Sets the value of upperLayer. The "fill" shapes are drawn in the upper layer.
    public setUpperLayer(layer: paper.Layer): void {
        this.upperLayer = layer;
    }

    // The layer containing the tip and midpoint curve handles
    public setHandleLayer(layer: paper.Layer): void {
        this.handleLayer = layer;
    }

    // Ensures that this bubble has all the required layers and creates them, if necessary
    private initializeLayers(): void {
        if (!this.lowerLayer) {
            this.lowerLayer = new paper.Layer(); // Note that the constructor automatically adds the newly-created layer to the project
        }
        if (!this.upperLayer) {
            this.upperLayer = new paper.Layer();
        }
        if (!this.handleLayer) {
            this.handleLayer = new paper.Layer();
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

        // Make the bubble part of the bubble+tail
        this.loadShapeAsync((newlyLoadedShape: paper.Item) => {
            this.makeShapes(newlyLoadedShape);
            if (this.isTransparent()) {
                this.outline.strokeWidth = 0;
                if (this.shadowShape) {
                    this.shadowShape.strokeWidth = 0;
                    this.shadowShape.fillColor = new paper.Color(0, 0, 0, 0);
                }
            }

            // If we're making the main shape first (especially, thoughtBubble),
            // we need to adjust its size and position before making the tail,
            // since we depend on that to decide where to stop making mini-bubbles.
            // If we're making the shape asynchronously, it's possible the call
            // that adjusted the tails already happened. But it won't hurt do do it
            // one more time once we have everything.
            this.adjustSizeAndPosition();
        });

        // Make any tails the bubble should have.
        // For some tail types (e.g., currently, thoughtTail), it's important
        // to make the main shape first, since making the tail shapes depends
        // on having it. Currently this can only be guaranteed with computational
        // shapes (that don't depend on loading an svg).
        if (this.spec.tails) {
            // mostly paranoia, but I ran into a problem here in one version of the code
            this.spec.tails.forEach(tail => {
                this.makeTail(tail);
            });
        }

        // Need to do this again, mainly to adjust the tail positions.
        // Note that in some cases, this might possibly happen before
        // the main bubble shape is created.
        this.adjustSizeAndPosition();

        this.monitorContent();
    }

    // Returns true if nothing in the bubble spec makes the bubble visible.
    public isTransparent() {
        if (this.spec.style !== "caption" && this.spec.style !== "none") {
            return false;
        }
        if (this.spec.tails.length > 0) {
            return false;
        }
        const outerBorderColor = this.spec.outerBorderColor;
        if (outerBorderColor && outerBorderColor !== "none") {
            return false;
        }
        if (this.spec.shadowOffset) {
            return false;
        }
        const backColors = this.spec.backgroundColors;
        if (backColors && backColors.length === 1 && backColors[0] === "transparent") {
            return true;
        }
        return false;
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
            // "none" is now a "computed" shape.
            default:
                console.log("unknown bubble type; using default");
                svg = Bubble.ellipseBubble();
        }

        return svg;
    }

    // Get the main shape immediately if computed.
    // return undefined if the current bubble style is not a computed shape.
    private getComputedShape(): paper.Item | undefined {
        if (this.content) {
            // remember the shape of the content from the most recent call.
            this.oldContentHeight = this.content.offsetHeight;
            this.oldContentWidth = this.content.offsetWidth;
        }
        const bubbleStyle = this.getStyle();
        activateLayer(this.lowerLayer); // at least for now, the main shape always goes in this layer.
        switch (bubbleStyle) {
            case "pointedArcs":
                return this.makePointedArcBubble();
            case "thought":
                return makeThoughtBubble(this);
            case "speech":
                return makeSpeechBubble(this.content.offsetWidth, this.content.offsetHeight, 0.6, 0.8);
            case "circle":
                return makeCircleBubble(this.content.offsetWidth, this.content.offsetHeight);
            case "caption": // purposeful fall-through; these four types should have the same shape
            case "caption-withTail":
            case "rectangle":
            case "none":
                const spec = this.getFullSpec();
                const rounderCornerRadii =
                    spec.cornerRadiusX && spec.cornerRadiusY
                        ? new paper.Size(spec.cornerRadiusX, spec.cornerRadiusY)
                        : undefined;
                // The padding thing is kind of backwards compatibility. In an earlier version,
                // the border set up by makeCaptionBox was always 3px, but we reduced the thickness
                // to zero for 'none' later. That actually left the box 3px larger, which acted as padding.
                // It's probably a good thing, might even be desirable to have some for other bubbles,
                // but we don't want to change things and break existing books. So, put the 3px padding
                // back in for 'none' (BL-11715).
                return makeCaptionBox(this, rounderCornerRadii, this.getBorderWidth(), bubbleStyle == "none" ? 3 : 0);
            default:
                return undefined; // not a computed shape, may be svg...caller has real default
        }
    }

    // Loads the shape (technically Item) corresponding to the specified bubbleStyle,
    // and calls the onShapeLoadeed() callback once the shape is finished loading
    // (passing it in as the shape parameter)
    private loadShapeAsync(onShapeLoaded: (shape: paper.Item) => void) {
        const bubbleStyle = this.getStyle();
        this.shapeIsComputed = false;
        var shape = this.getComputedShape();
        if (shape) {
            this.shapeIsComputed = true;
            onShapeLoaded(shape);
            return;
        }
        const svg = Bubble.getShapeSvgString(bubbleStyle);

        activateLayer(this.lowerLayer); // Sets this bubble's lowerLayer as the active layer, so that the SVG will be imported into the correct layer.

        // ImportSVG may return asynchronously if the input string is a URL.
        // Even though the string we pass contains the svg contents directly (not a URL), when I ran it in Bloom I still got a null shape out as the return value, so best to treat it as async.
        this.lowerLayer.project.importSVG(svg, {
            onLoad: (item: paper.Item) => {
                onShapeLoaded(item);
            }
        });
    }

    private hasOuterBorder(): boolean {
        return !!this.getFullSpec().outerBorderColor && this.spec.outerBorderColor !== "none";
    }

    // Attaches the specified shape to this object's content element
    private makeShapes(shape: paper.Item) {
        var oldOutline = this.outline;
        var oldFillArea = this.fillArea;
        activateLayer(this.lowerLayer);
        this.setOutline(shape);

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
            this.setOutline((outlineShape as paper.Shape).toPath());
            this.lowerLayer.addChild(this.outline);
        }
        if (oldOutline) {
            this.outline.insertBelow(oldOutline);
            oldOutline.remove();
        }
        this.outline.strokeWidth = this.getBorderWidth();
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

        // If we don't do this it somehow shows up in the fill area clone,
        // on top of the outline if it dips inside the rectangle
        this.contentHolder.remove();

        if (outlineShape && !this.hasOuterBorder()) {
            // We can use the new strategy that supports partly transparent background colors
            this.outline.fillColor = this.getBackgroundColor();
            Comical.setItemOnClick(this.outline, () => {
                Comical.activateBubble(this);
            });
        } else {
            // This strategy does not work well with partly transparent background colors.
            // The partly-transparent background won't erase any part of the tail that is
            // inside the bubble. Nor will it properly erase the half of the border width
            // that is 'inside' the bubble. So new bubbles should use outlineShape if possible.
            this.fillArea = this.outline.clone({ insert: false });
            Comical.setItemOnClick(this.fillArea, () => {
                Comical.activateBubble(this);
            });

            // Any stroke on the fill just confuses things.
            // An earlier version made the stroke transparent so that the outline border
            // would show through and the fill area would be shrunk to inside the border.
            // Then (I think) Comical was changed so that the border grows both ways from the ideal
            // line, and the fill is painted (under the border) all the way to the ideal line.
            // Thus, even a transparent border didn't stop the background from overlaying
            // the outline border, which is at a lower layer. So now we just remove the stroke
            // here, and adjust the width of the outline border. Unfortunately, this only works
            // well if the background color has no transparency.
            this.fillArea.strokeWidth = 0;
            this.outline.strokeWidth *= 2;

            this.fillArea.fillColor = this.getBackgroundColor();

            if (oldFillArea) {
                this.fillArea.insertBelow(oldFillArea);
                oldFillArea.remove();
            } else {
                this.upperLayer.addChild(this.fillArea);
            }
        }
        if (this.hasOuterBorder()) {
            var outerBorder = this.outline.clone();
            // We want two more borders, a thick one in the outerBorderColor,
            // and a thin black one (or perhaps eventually the color of the main
            // border, if we allow that to be controlled). However, doing the main outer border as a
            // stroke color is problematic: there doesn't seem to be a way to put
            // more than one stroke on a single shape, and if we try to wrap another
            // shape around it and use stroke, we'll tend to get white space in between,
            // especially since I also can't find a way to grow a shape by an exact
            // distance in all directions. So instead, we make a clone shape and set
            // its FILL color to the outerBorderColor...and then put it behind the
            // main shape so only the part outside it shows. And we can use its stroke for
            // the second outer border.
            outerBorder.fillColor = new paper.Color(this.getFullSpec().outerBorderColor!);
            outerBorder.insertBelow(this.outline);
            // Now we have to get it the right size, which is also tricky.
            // We want about 8 px of red. The overall shape will eventually be scaled
            // by this.content.offsetWidth/(contentHolder width), so first we
            // apply the inverse of that to 16 to get the absolute increase in width
            // that we want (there's a factor of two for border on each side).
            // Scaling is a fraction, so to make the outerBorder 16/scale wider, we scale by
            // (width + 16/scale)/width, which when multiplied by width is 16/scale bigger.
            // And similarly for the vertical scale, which is very likely different.
            const chWidth = (this.contentHolder as any).size.width;
            const hScale = this.content.offsetWidth / chWidth;
            const chHeight = (this.contentHolder as any).size.height;
            const vScale = this.content.offsetHeight / chHeight;
            const obWidth = outerBorder.bounds.width;
            const obHeight = outerBorder.bounds.height;
            outerBorder.scale((obWidth + 16 / hScale) / obWidth, (obHeight + 16 / vScale) / obHeight);

            // Visually this seems to give the right effect. I have not yet
            // figured out why the main border is not coming out as thick as I think
            // it should (and does, in the absense of the overlaying fill shape).
            outerBorder.strokeWidth = 1;
            // We don't have to insert this group, just make it and set it as this.outline,
            // so that when we adjustShapes() both shapes get adjusted.
            const newOutline = new paper.Group([outerBorder, this.outline]);
            this.outline = newOutline;
        }
    }

    public getDefaultContentHolder(): paper.Shape {
        const contentTopLeft = new paper.Point(this.content.offsetLeft, this.content.offsetTop);
        const contentSize = new paper.Size(this.content.offsetWidth, this.content.offsetHeight);
        const contentHolder = new paper.Shape.Rectangle(contentTopLeft, contentSize);
        contentHolder.name = "content-holder";

        // the contentHolder is normally removed, but this might be useful in debugging.
        contentHolder.strokeColor = new paper.Color("red");
        contentHolder.fillColor = new paper.Color("transparent");

        return contentHolder;
    }

    public getBorderWidth() {
        const style = this.getStyle();
        if (style === "rectangle") {
            return 1; // BL-11618, we want rectangle thickness to match the tail line
        }
        return style === "none" ? 0 : Bubble.defaultBorderWidth;
    }

    public getBackgroundColor(): paper.Color {
        const spec = this.getFullSpec();
        // enhance: we want to do gradients if the spec calls for it by having more than one color.
        // Issue: sharing the gradation process with any tails (and maybe
        // other bubbles in family??)
        if (!spec.backgroundColors && spec.style === "none") {
            // default background Color for style 'none' is now transparent
            spec.backgroundColors = ["transparent"];
            this.setBubbleSpec(spec);
        }
        if (spec.backgroundColors && spec.backgroundColors.length) {
            if (spec.backgroundColors.length === 1) {
                return new paper.Color(spec.backgroundColors[0]);
            }

            const gradient = new paper.Gradient();
            const stops: paper.GradientStop[] = [];
            // We want the gradient offsets evenly spaced from 0 to 1.
            spec.backgroundColors!.forEach((x, index) =>
                stops.push(
                    new paper.GradientStop(new paper.Color(x), (1 / (spec.backgroundColors!.length - 1)) * index)
                )
            );
            gradient.stops = stops;

            const xCenter = this.content.offsetWidth / 2;

            // enhance: we'd like the gradient to extend over the whole fillArea,
            // but we can't depend on that existing when we need this, especially when
            // called by one of the tails. So just make one from the top of the content
            // to the bottom.
            // After introducing new algorithmic captions, it seems to work in all cases to use
            // the Y coordinate of the top of the box to the Y coordinate of the bottom.
            // Previously, captions seemed to need using 0 to height instead.
            //
            // enhance 2: If the tail is above the bubble, might make more sense to do gradient bottom -> top instead of top -> bottom
            const gradientOrigin = new paper.Point(xCenter, this.outline.bounds.top);
            const gradientDestination = new paper.Point(xCenter, this.outline.bounds.top + this.outline.bounds.height);

            // Old code which used 0 to height (seemed necessary for SVG captions)
            // const gradientOrigin = new paper.Point(xCenter, 0);
            // const gradientDestination = new paper.Point(xCenter, this.outline ? this.outline.bounds.height : 50);

            const result: paper.Color = new paper.Color(gradient, gradientOrigin, gradientDestination);
            return result;
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
        if (
            this.shapeIsComputed &&
            Math.abs(contentWidth - this.oldContentWidth) + Math.abs(contentHeight - this.oldContentHeight) > 0.001
        ) {
            const shape = this.getComputedShape()!;
            this.makeShapes(shape);
        }
        if (this.contentHolder) {
            const [desiredHScale, desiredVScale] = this.getScaleFactors();
            const scaleXBy = desiredHScale / this.hScale;
            const scaleYBy = desiredVScale / this.vScale;

            this.outline.scale(scaleXBy, scaleYBy);
            if (this.shadowShape) {
                this.shadowShape.scale(scaleXBy, scaleYBy);
            }
            if (this.fillArea) {
                this.fillArea.scale(scaleXBy, scaleYBy);
            }
            this.hScale = desiredHScale;
            this.vScale = desiredVScale;
        }
        const contentLeft = this.content.offsetLeft;
        const contentTop = this.content.offsetTop;
        let contentCenter = new paper.Point(contentLeft + contentWidth / 2, contentTop + contentHeight / 2);
        if (this.outline) {
            // it's just possible if shape is created asynchronously from
            // an SVG that this method is called to adjust tails before the main shape
            // exists. If so, it will be called again when it does.

            if (this.getBorderWidth() % 2 === 1) {
                // To draw odd width lines properly, we need the coordinates where they are drawn to end
                // in 0.5. If not already, make it so.
                // (Otherwise, canvas draws the line one pixel wider, with the two outer pixels being a
                // lighter color. This is particularly bad when we want a one-pixel black line (e.g., for a
                // rectangle) and get a two-pixel grey one (a secondary problem in BL-14075).)
                // This fix is mainly focused on rectangles, the only thing we currently draw with width one.
                // Oddly, this is always achieved by adding 0.5. For example, if the width is even, the initial
                // contentCenter.x is a whole number, adding 0.5 makes it end in 0.5, and subtracting half of it
                // to get left makes left end in 0.5, since half of it is a whole number. If the width is odd,
                // contentCenter.x starts out ending in 0.5, adding 0.5 makes it a whole number, but now
                // half of the width ends in 0.5, so subtracting that to get left again makes left end in 0.5.
                contentCenter = contentCenter.add(new paper.Point(0.5, 0.5));
            }
            this.outline.position = contentCenter;
            if (this.fillArea) {
                this.fillArea.position = contentCenter;
            }
            if (this.shadowShape) {
                // We shouldn't have a shadowShape at all unless we have a shadowOffset.
                // In case somehow we do, hide the shadow completely when that offset is
                // falsy by putting it entirely behind the main shapes.
                this.shadowShape.position = this.outline.position.add(this.spec.shadowOffset || 0);
            }
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
            // Need to check both child and parent, because even if we loaded the bubbles in a certain order,
            // due to async nature, we can't be sure which one will be loaded first.
            // (This should only applicable to determining whether the tail is visible or not.
            // Don't think we need to adjust the joiners, they should all be loaded at that time.)
            const shouldTailsBeVisible = !this.isOverlapping(parent);

            console.assert(this.tails.length <= 1, "A child bubble may have at most 1 tail.");
            this.tails.forEach(tail => {
                tail.setTailAndHandleVisibility(shouldTailsBeVisible);
            });
        }
        this.uniteShapes();
    }

    private setOutline(outline: paper.Item): void {
        this.outline = outline;
        this.oulineStrokeColor = outline.strokeColor;
    }

    public uniteShapes() {
        // Since we have set the includeSelf flag, we are guaranteed that selfAndRelatives will contain
        // at least this (self) bubble.
        const selfAndRelatives = Comical.findRelatives(this, true);
        // Get rid of any old combinedShapes. This is especially important to do first when
        // switching to 'none' as no new one will be created.
        selfAndRelatives.forEach(r => {
            if (r.combinedShapes) {
                r.combinedShapes.remove();
                r.combinedShapes = undefined;
            }
        });
        const parent = selfAndRelatives[0];
        if (selfAndRelatives.some(r => !r.outline || !(r.outline as paper.PathItem).unite)) {
            // We can't do this before the outlines have been created, or if the
            // outline is some complex object, like a Group or an SVG import,
            // that doesn't implement the unite() function.
            return;
        }
        // Accumulates tails that can't be "united" with their bubbles.
        // Currently these are LineTails.
        const tailsToClip: Tail[] = [];
        let combinedPath: paper.PathItem = parent.outline.clone({ insert: false }) as paper.PathItem;
        combinedPath = parent.uniteTails(combinedPath, tailsToClip);
        // Now merge any remaining family members (note the first one, the parent, is skipped).
        for (var i = 1; i < selfAndRelatives.length; i++) {
            if (!selfAndRelatives[i].isOverlapping(selfAndRelatives[i - 1])) {
                // Child tails should overlap the shape we already have.
                // Joining the tail first may help to keep the shape simple, or at least contiguous.
                // Not sure this is necessary, unite() seems to handle discontiguous shapes.
                combinedPath = selfAndRelatives[i].uniteTails(combinedPath, tailsToClip);
            } else {
                // If the bubbles overlap we don't need the joining tail; just hide it.
                selfAndRelatives[i].tails.forEach(t => t.pathstroke && this.hideShape(t.pathstroke));
            }
            // We can be confident the outline is a PathItem because we checked
            // above that it has the unite() function.
            combinedPath = combinedPath.unite(selfAndRelatives[i].outline as paper.PathItem);
            this.hideShape(selfAndRelatives[i].outline);
        }
        combinedPath.strokeWidth = this.getBorderWidth();
        combinedPath.strokeColor = this.oulineStrokeColor;
        combinedPath.fillColor = this.getBackgroundColor();
        parent.combinedShapes = combinedPath;
        if (tailsToClip.length) {
            const groupItems: paper.PathItem[] = [combinedPath];
            tailsToClip.forEach(t => {
                if (!t.pathstroke) return;

                let clippedTail = t.pathstroke.clone({ insert: false }) as paper.PathItem;
                this.hideShape(t.pathstroke);
                selfAndRelatives.forEach(r => {
                    // The following didn't work, not sure why not.
                    //    clippedTail = clippedTail.subtract(r.outline as PathItem, { insert: false });
                    // For now the only tails we need to clip are lines.
                    // This simple algorithm is enough. If the line crosses other
                    // boxes besides the one it belongs to, it will simply be drawn.
                    if (r.tails.includes(t)) {
                        const outlinePath = r.outline as paper.PathItem;
                        const intersections = outlinePath.getIntersections(clippedTail);
                        if (intersections.length > 0) {
                            clippedTail = (t as LineTail).makeShape(intersections[0].point);
                            clippedTail.remove();
                        }
                    }
                });
                groupItems.push(clippedTail);
            });

            parent.combinedShapes = new paper.Group(groupItems);
        }
        parent.combinedShapes.insertBelow(parent.outline);
        parent.combinedShapes.sendToBack(); // maybe redundant?
        this.hideShape(parent.outline);
        selfAndRelatives.forEach(r => {
            if (r.shadowShape) {
                // Shadow needs to be behind the combinedShape.
                r.shadowShape.sendToBack();
            }
        });
    }

    uniteTails(combinedPath: paper.PathItem, tailsToClip: Tail[]): paper.PathItem {
        let result = combinedPath;
        this.tails.forEach(t => {
            if (t.canUnite() && t.pathstroke) {
                result = result.unite(t.pathstroke, { insert: false });
                this.hideShape(t.pathstroke);
            } else {
                tailsToClip.push(t);
            }
        });
        return result;
    }

    public static almostInvisibleColor = new paper.Color(1, 1, 1, 0.001);

    // The original shapes that we merge into the combinedShapes path still have click
    // actions and so forth attached, and are the things we move and reshape and then
    // use again to make new combinedShapes. So they need to stay around. But we don't
    // want to actually see them...that would defeat the purpose of combining them
    // into a single shape that omits interior lines. OTOH, they can't be completely
    // transparent, or paper.js wouldn't recognize clicks on them. So make them very,
    // very nearly transparent.
    hideShape(shape: paper.Item): void {
        shape.strokeColor = Bubble.almostInvisibleColor;
        shape.fillColor = Bubble.almostInvisibleColor;
    }

    getScaleFactors(): [number, number] {
        const contentWidth = this.content.offsetWidth;
        const contentHeight = this.content.offsetHeight;

        var holderWidth = (this.contentHolder as any).size.width;
        var holderHeight = (this.contentHolder as any).size.height;
        const desiredHScale = contentWidth / holderWidth;
        const desiredVScale = contentHeight / holderHeight;

        return [desiredHScale, desiredVScale];
    }

    // Returns true if the bubbles overlap. Otherwise, returns false
    public isOverlapping(otherBubble: Bubble): boolean {
        if (!this.outline || !otherBubble.outline) {
            // If at least one of the bubbles doesn't have its shape (yet), we define this as being not overlapping
            return false;
        }

        const isIntersecting = this.outline.intersects(otherBubble.outline);
        if (isIntersecting) {
            // This is the standard case (at least if an overlap does exist) where this bubble's outline intersects the other's outline
            return true;
        } else {
            // TODO: Check pathological case where one bubble is entirely contained within the other
            return false;
        }
    }

    // Returns true if the point is contained within the bubble itself (not including the tail).
    public isHitByPoint(point: paper.Point): boolean {
        if (!this.fillArea) {
            if (this.outline?.fillColor && this.outline.fillColor.alpha > 0) {
                return !!this.outline.hitTest(point);
            }
            // If style = none, then fillArea and outline can both be undefined
            // Do a hit test against the underlying content element directly (rather than the bubble fillArea, which doesn't exist)
            return this.isContentHitByPoint(point);
        }

        const hitResult: paper.HitResult | null = this.fillArea.hitTest(point);
        return !!hitResult;
    }

    // Returns true if the point is contained within the content element's borders.
    public isContentHitByPoint(point: paper.Point): boolean {
        // The point is relative to the canvas... so you need to make sure to get the position of the content relative to the canvas too.
        // OffsetLeft/Top works perfectly. It is relative to the offsetParent (which is the imageContainer).
        // It goes from the inside edge of the parent's border (which coincides with where the canvas element is placed)
        //     to the outside edge of the content's border.
        //     That is perfect, because that means 0, 0 for content's offsetLeft/Top will be 0, 0 in the coordinate system our Comical canvas uses.
        // Both systems are also independent of the zoom scaling
        // So that works perfectly!

        const left = this.content.offsetLeft;
        const right = left + this.content.offsetWidth; // FYI, includes content's borders, which I think is good.
        const top = this.content.offsetTop;
        const bottom = top + this.content.offsetHeight;

        return left <= point.x && point.x <= right && top <= point.y && point.y <= bottom;
    }

    private adjustJoiners(newTip: paper.Point): void {
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
        const currentBubbleStyle = this.spec.style;
        if (this.spec.tails.length === 0) {
            return;
        }

        const tipPoint = new paper.Point(desiredTail.tipX, desiredTail.tipY);
        const midPoint = new paper.Point(desiredTail.midpointX, desiredTail.midpointY);
        let startPoint = this.calculateTailStartPoint();

        activateLayer(this.upperLayer);

        // This code was initially written to have a system of different tails based on
        // a tail style parameter, but actually the type of tail used turns out to be more
        // based on which style of bubble is used.
        let tail: Tail;
        switch (currentBubbleStyle) {
            // Currently thought tails are specific to thought bubbles.
            // So these tails don't have their own style; instead,
            // failing to match a known tail style, we fall through here
            // and make one based on the bubble style.
            case "thought":
                tail = new ThoughtTail(
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
            // Currently captions have optional tails. If they have a tail,
            // it will be a straight line. The 'none' style may soon be able to have tails too.
            case "caption":
            case "rectangle":
            case "none": // Purposeful fall-through.
                tail = new LineTail(
                    startPoint,
                    tipPoint,
                    this.lowerLayer,
                    this.upperLayer,
                    this.handleLayer,
                    desiredTail,
                    this
                );
                break;
            // Currently every other bubble type uses an arc tail.
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

    public calculateTailStartPoint(): paper.Point {
        return new paper.Point(
            this.content.offsetLeft + this.content.offsetWidth / 2,
            this.content.offsetTop + this.content.offsetHeight / 2
        );
    }

    public static makeDefaultTail(targetDiv: HTMLElement): TailSpec {
        // careful here to use dimensions like offset that don't get inflated
        // by transform:scale. getBoundingContextRect() would need to be unscaled.
        const parent: HTMLElement = targetDiv.parentElement as HTMLElement;
        const targetLeft = targetDiv.offsetLeft;
        const targetWidth = targetDiv.offsetWidth;
        const targetRight = targetLeft + targetWidth;

        const targetTop = targetDiv.offsetTop;
        const targetHeight = targetDiv.offsetHeight;
        const targetBottom = targetTop + targetHeight;

        const parentLeft = 0; // offset of target is already relative to parent.
        const parentWidth = parent.offsetWidth;
        const parentRight = parentLeft + parentWidth;

        const parentTop = 0;
        const parentHeight = parent.offsetHeight;
        // center of targetbox relative to parent.
        const rootCenter = new paper.Point(
            targetLeft - parentLeft + targetWidth / 2,
            targetTop - parentTop + targetHeight / 2
        );
        let targetX = targetLeft - parentLeft - targetWidth / 2;
        if (targetLeft - parentLeft < parentRight - targetRight) {
            // box is closer to left than right...make the tail point right
            targetX = targetRight - parentLeft + targetWidth / 2;
        }
        let targetY = targetBottom - parentTop + 20;
        if (targetY > parentHeight - 5) {
            targetY = parentHeight - 5;
        }
        if (targetY < targetBottom - parentTop) {
            // try pointing up
            targetY = targetTop - parentTop - 20;
            if (targetY < 5) {
                targetY = 5;
            }
        }
        // Final checks: make sure the target is at least in the picture.
        if (targetX < 0) {
            targetX = 0;
        }
        if (targetX > parentWidth) {
            targetX = parentWidth;
        }
        if (targetY < 0) {
            targetY = 0;
        }
        if (targetY > parentHeight) {
            targetY = parentHeight;
        }
        const target = new paper.Point(targetX, targetY);
        const mid: paper.Point = Bubble.defaultMid(
            rootCenter,
            target,
            new paper.Size(targetDiv.offsetWidth, targetDiv.offsetHeight)
        );
        const result: TailSpec = {
            tipX: targetX,
            tipY: targetY,
            midpointX: mid.x,
            midpointY: mid.y,
            autoCurve: true
        };
        return result;
    }

    static adjustTowards(origin: paper.Point, target: paper.Point, originSize: paper.Size): paper.Point {
        // Return the origin point adjusted along a line towards target far enough to fall on
        // the border of a retangle of size originSize centered at origin.
        let delta = target.subtract(origin);
        const xRatio = delta.x == 0 ? Number.MAX_VALUE : originSize.width / 2 / Math.abs(delta.x);
        const yRatio = delta.y == 0 ? Number.MAX_VALUE : originSize.height / 2 / Math.abs(delta.y);
        const borderRatio = Math.min(xRatio, yRatio); // use whichever is closer
        return origin.add(delta.multiply(borderRatio));
    }

    // Find the default midpoint for a tail from start to target, given the sizes of the
    // bubbles at start and possibly (if start is a child) at target.
    // First, we compute a point half way between where the line from start to target
    // crosses the rectangle(s) of the specified size(s) centered at the points...an
    // approximation of half way between the bubbles, or between the bubble and the tip.
    // Then we bump it a little to one side so that the curve bends slightly towards
    // the y axis, by an amount that decreases to zero as the line approaches
    // horizontal or vertical.
    static defaultMid(
        start: paper.Point,
        target: paper.Point,
        startSize: paper.Size,
        targetSize?: paper.Size
    ): paper.Point {
        const startBorderPoint = Bubble.adjustTowards(start, target, startSize);
        const targetBorderPoint = targetSize ? Bubble.adjustTowards(target, start, targetSize) : target;

        let delta = targetBorderPoint.subtract(startBorderPoint);
        const mid = startBorderPoint.add(delta.divide(2));

        delta = delta.divide(5);
        delta.angle -= 90;
        // At this point, delta is 10% of the distance from start to target,
        // at right angles to that line, and on the side of it toward
        // the y axis. We prefer the line to curve in that direction,
        // both above and below the x axis.

        // Now, we want to reduce the curvature if the line is close to
        // horizontal or vertical. This is in line with comic expectations;
        // it also has the benefit that as the tip is dragged from one
        // quadrant to another, the transition is smooth, as the curve
        // reduces to a line and then starts to bend the other way rather
        // than suddenly jumping from one quadrant's rule to the other.
        if (Math.abs(delta.x) > Math.abs(delta.y)) {
            delta.length *= delta.y / delta.x;
        } else {
            delta.length *= delta.x / delta.y;
        }
        return mid.add(delta);
    }

    // This is a helper method which is useful for making a variety of computed bubble types.
    // It returns a Group containing a path and a content-holder rectangle
    // as makeShapes requires, given a function that makes a path from
    // an array of points and a center.
    // The content-holder rectangle is made a bit smaller than the actual height and width
    // of the bubble's content; makeShapes will scale it back up.
    // The array of points is created by first making our standard speech bubble shape
    // for a text box this shape (plus the requested padding, if any),
    // then breaking it up into segments about 30px long.
    // A little randomness (but predictable for a box of a given size) is
    // introduced to make things look more natural.
    // Enhance: could provide some parameter to control the ratio between
    // the border length and the number of points.
    makeBubbleItem(
        padWidth: number,
        pathMaker: (points: paper.Point[], center: paper.Point) => paper.Path
    ): paper.Item {
        const width = this.content.clientWidth;
        const height = this.content.clientHeight;
        const [outlineShape, contentHolder] = makeSpeechBubbleParts(
            width + padWidth * 2,
            height + padWidth * 2,
            0.6,
            0.8
        );
        outlineShape.remove(); // don't want it on the canvas, just use it to make points.

        // contentHolder isn't actually width+padWidth*2 wide and height + padWidth * 2 high.
        // It's a rectangle fitting inside an oval that size.
        // We want contentHolder to end up a size such that, when it is scaled to (width, height),
        // the oval is padWidth outside it.
        // This is difficult to visualize. The "playing with beziers" story may help. We've
        // asked for a speech bubble width + padWidth*2 wide...that's the width of the blue
        // oval. Along with it we get a contentHolder, like the red rectangle, that touches
        // the oval. We now want to make contentHolder smaller, so the red rectangle doesn't
        // touch the oval, but is 'padWidth' clear of it in both directions. However, we don't
        // just want it to be smaller by padWidth...we want that much clearance AFTER other
        // code makes the transformation that maps contentHolder onto our bubble's content
        // (which is 'width' wide).
        //
        // We want to solve for xRatio, which is the scaling factor we need to apply to
        // the eventual content holder (with the new width we are about to set) to grow
        // it (and the final bubble shape) to fit our content (width wide).
        // To do so, we can set up a system of 3 equations, 3 unknowns, and then use algebra
        // The equations we know:
        // 1) xRatio = shrunkPadWidth / padWidth
        // 2) xRatio = newContentHolderWidth / width
        // 3) newContentHolderWidth + 2 * shrunkPadWidth = contentHolderWidth
        // where xRatio is the ratio between what we're going to make the contentHolder width
        // and the actual width of the content, and shrunkPadWidth is the pad width
        // we need in the shape we're making (that will be scaled up by xRatio to padWidth).
        //
        // Of these, xRatio, shrunkPadWidth, and newContentHolderWidth are variables.
        // (padWidth, width, and contentHolderWidth are already known)
        // From here, you can do algebra to get this:
        const xRatio = contentHolder.size.width / (width + padWidth * 2);
        const yRatio = contentHolder.size.height / (height + padWidth * 2);
        contentHolder.set({
            center: contentHolder.position,
            size: new paper.Size(width * xRatio, height * yRatio)
        });

        // aiming for arcs ~30px long, but fewer than 5 would look weird.
        const computedArcCount = Math.round(((width + height) * 2) / 30);
        const arcCount = Math.max(computedArcCount, 5);
        const points: paper.Point[] = [];

        // We need a 'random' number generator that is predictable so
        // the points don't move every time we open the page.
        const rng = new SimpleRandom(width + height);

        let remainingLength = outlineShape.length;
        const delta = remainingLength / arcCount;
        const maxJitter = delta / 2;
        for (let i = 0; i < arcCount; i++) {
            const expectedPlace = i * delta;
            // This introduces a bit of randomness to make it look more natural.
            // (Since we're working around an oval, it doesn't matter whether
            // all the jitters are positive or whether they go both ways,
            // except that we have to be careful not to produce a negative
            // actualPlace or one beyond the length of the curve, since that
            // will throw an exception.)
            const jitter = maxJitter * rng.nextDouble();
            const actualPlace = expectedPlace + jitter;
            const point = outlineShape.getLocationAt(actualPlace).point;
            points.push(point);
        }

        const outline = pathMaker(points, contentHolder.position!);
        return new paper.Group([outline, contentHolder]);
    }

    // Make a computed bubble shape by drawing an inward arc between each pair of points
    // in the array produced by makeBubbleItem.
    makePointedArcBubble(): paper.Item {
        const arcDepth = 7;
        return this.makeBubbleItem(arcDepth, (points, center) => {
            const outline = new paper.Path();
            for (let i = 0; i < points.length; i++) {
                const start = points[i];
                const end = i < points.length - 1 ? points[i + 1] : points[0];
                const mid = new paper.Point((start.x + end.x) / 2, (start.y + end.y) / 2);
                const deltaCenter = mid.subtract(center);
                deltaCenter.length = arcDepth;
                const arcPoint = mid.subtract(deltaCenter);
                const arc = new paper.Path.Arc(start, arcPoint, end);
                arc.remove();
                outline.addSegments(arc.segments);
            }
            outline.strokeWidth = 1;
            outline.strokeColor = new paper.Color("black");
            outline.closed = true; // It should already be, but may help paper.js to treat it so.
            outline.name = "outlineShape";
            return outline;
        });
    }

    // The SVG contents of a round (elliptical) bubble
    //
    // Note: An algorithmic (getComputedShapes) version of an ellipse exists here: https://github.com/BloomBooks/comical-js/blob/algorithimicEllipses/src/ellipseBubble.ts
    //   The scaled ellipse bubble there is mathematically better proportioned and positioned, simpler, and probably faster than the SVG one here
    //   However, as a result of the improvement, it is only very similar but not 100% identical to this existing SVG one
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
