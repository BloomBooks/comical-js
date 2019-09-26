// This is the interface for storing the state of a bubble.

// BubbleSpecPattern actually defines all the BubbleSpec properties, but
// all of them are optional, for use in methods designed to allow a subset
// of properties to be changed. BubbleSpec overrides to make a minimal set required.
// The main purpose of this class is to store the state of a bubble in a modified JSON
// string in the data-bubble attribute of an HTML element. See the Bubble methods
// setBubbleSpec and getBubbleSpec. This allows re-creatting the paper.js editable
// state of the bubble even after we have discarded all that in favor of an SVG
// for a finished HTML document that doesn't depend on Javascript.
export interface BubbleSpecPattern {
  version?: string; // currently 1.0
  style?: string; // currently one of speech or shout
  tips?: Tip[];
  level?: number; // relative z-index, bubbles with same one merge, larger overlay (not implemented yet)
  borderStyle?: string; // not implemented or fully designed yet
  backgroundColors?: string[]; //  just 1 color for solid, multiple for gradient. Omit for white. Top to bottom.
  outerBorderColor?: string; // omit for black; not implemented.
}

export interface BubbleSpec extends BubbleSpecPattern {
  // A real bubble stored in data-bubble should always have at least version, style, tips, and level.
  // The only things overridden here should be to change something from optional to required.
  version: string; // currently 1.0
  style: string; // currently one of speech or shout
  tips: Tip[];
}
// Design has a parentBubble attribute...not sure whether we need this, so leaving out for now.
// Do we need to control things like angle of gradient?

export interface Tip {
  targetX: number; // tip point, relative to the main image on which the bubble is placed
  targetY: number;
  midpointX: number; // notionally, tip's curve passes through this point
  midpointY: number;
}
// Do we need to specify a width? Other attributes for bezier curve?
// Current design: start with three points, the target, midpoint, and the root (center of the text block).
// imagine a straight line from the root to the target.
// Imagine two line segments at right angles to this, a base length centered at the root,
// and half that length centered at the midpoint.
// The tip is made up of two curves each defined by the target, one end of the root segment,
// and the corresponding end of the midpoint segment.
