// This is the interface for storing the state of a bubble.

// BubbleSpecPattern actually defines all the BubbleSpec properties, but
// all of them are optional, for use in methods designed to allow a subset
// of properties to be changed. BubbleSpec overrides to make a minimal set required.
// The main purpose of this class is to store the state of a bubble in a modified JSON
// string in the data-bubble attribute of an HTML element. See the Bubble methods
// setBubbleSpec and getBubbleSpec. This allows re-creatting the paper.js editable
// state of the bubble even after we have discarded all that in favor of an SVG
// for a finished HTML document that doesn't depend on Javascript.
// If you add a property here, consider handling it in Bubble.mergeWithNewBubbleProps()
export interface BubbleSpecPattern {
    version?: string; // currently 1.0
    style?: string; // The style of bubble, e.g. speech, shout, caption, pointedArcs, ellipse
    tails?: TailSpec[];
    level?: number; // relative z-index, bubbles with same one merge, larger overlay (not implemented yet)
    borderStyle?: string; // not implemented or fully designed yet
    // Just 1 color for solid, multiple for gradient (top to bottom). Omit for white.
    // Individual strings can be things that can be passed to paper.js to define colors.
    // Typical CSS color names are supported, and also #RRGGBB. Possibly others, but lets not
    // count on any more options yet.
    backgroundColors?: string[];
    outerBorderColor?: string; // omit for none.

    // bubbles on the same level with this property are linked in an order specified by this.
    // bubbles without order (or with order zero) are not linked.
    // Do not use negative numbers or zero as an order.
    order?: number;
    shadowOffset?: number;
}

export interface BubbleSpec extends BubbleSpecPattern {
    // A real bubble stored in data-bubble should always have at least version, style, tips, and level.
    // The only things overridden here should be to change something from optional to required.
    version: string; // currently 1.0
    style: string; // currently one of speech or shout
    tails: TailSpec[];
}
// Design has a parentBubble attribute...not sure whether we need this, so leaving out for now.
// Do we need to control things like angle of gradient?

export interface TailSpec {
    tipX: number; // tip point, relative to the main image on which the bubble is placed
    tipY: number;
    midpointX: number; // notionally, tip's curve passes through this point
    midpointY: number;
    joiner?: boolean; // true if it joins to its parent bubble

    // [This optional tail style parameter is not currently used at all.]
    style?: string; // currently one of straight, or arc
    // true to automatically keep the shape of the tail matching
    // Comical's default shape for the current root and tip when
    // either moves. False for the user to control the shape using
    // other handles, if any (though Comical may still move the
    // other handles to some extent when the tip or root move).
    autoCurve?: boolean;
}
// Do we need to specify a width? Other attributes for bezier curve?
// Current design: start with three points, the target, midpoint, and the root (center of the text block).
// imagine a straight line from the root to the target.
// Imagine two line segments at right angles to this, a base length centered at the root,
// and half that length centered at the midpoint.
// The tip is made up of two curves each defined by the target, one end of the root segment,
// and the corresponding end of the midpoint segment.
