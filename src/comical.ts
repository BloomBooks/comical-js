import { Path, Point, Color, Item, project, setup } from "paper";

import Bubble from "./bubble";
import { uniqueIds } from "./uniqueId";

// Manages a collection of comic bubbles warpped around HTML elements that share a common parent.
// Each element that has a comic bubble has a data-bubble attribute specifying the appearance
// of the bubble. Comical can help with initializing this to add a bubble to an element.
// The data-bubble attributes contain a modified JSON representation of a BubbleSpec
// describing the bubble.
// Comical is designed to be the main class exported by Comical.js, and provides methods
// for setting things up (using a canvas overlayed on the common parent of the bubbles
// and paper.js shapes) so that the bubbles can be edited by dragging handles.
// It also supports drawing groups of bubbles in layers, with appropriate merging
// of bubbles at the same level.
// As the bubbles are edited using Comical handles, the data-bubble attributes are
// automatically updated. It's also possible to alter a data-bubble attribute using
// external code, and tell Comical to update things to match.
// Finally, Comical can replace a finished bubble canvas with a single SVG, resulting in
// a visually identical set of bubbles that can be rendered without using Canvas and
// Javascript.
export default class Comical {
  static backColor = new Color("white");

  // Given a list of shapes, which should initially have no stroke or fill color,
  // draws them twice, once with a black outline, then again filled with our
  // backColor. If the shapes overlap, this gives the effect of outlining the
  // combined shape. Then we draw the draggable tail on top, also with merged outline.
  public static drawTailOnShapes(
    start: Point,
    mid: Point,
    tip: Point,
    shapes: Item[],
    elementToUpdate?: HTMLElement
  ) {
    const interiors: Path[] = [];
    shapes.forEach(s => {
      var copy = s.clone() as Path;
      interiors.push(copy);
      copy.bringToFront(); // already in front of s, want in front of all
      copy.fillColor = Comical.backColor;
    });
    var stroke = new Color("black");
    shapes.forEach(s => (s.strokeColor = stroke));
    Bubble.drawTail(start, mid, tip, interiors[0], elementToUpdate);
  }

  public static convertCanvasToSvgImg(parent: HTMLElement) {
    const canvas = parent.getElementsByTagName("canvas")[0];
    if (!canvas) {
      return;
    }
    // Remove drag handles
    project!
      .getItems({
        recursive: true,
        match: (x: any) => {
          return x.name && x.name.startsWith("handle");
        }
      })
      .forEach(x => x.remove());
    const svg = project!.exportSVG() as SVGElement;
    svg.classList.add("bubble-edit-generated");
    uniqueIds(svg);
    canvas.parentElement!.insertBefore(svg, canvas);
    canvas.remove();
  }

  // call after adding or deleting elements with data-bubble
  // assumes convertBubbleJsonToCanvas has been called and canvas exists
  public static update(parent: HTMLElement) {
    project!.activeLayer.removeChildren();
    const elements = parent.ownerDocument!.evaluate(
      ".//*[@data-bubble]",
      parent,
      null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    // Enhance: we want to be able to make all the bubbles and all the tails
    // as a connected set so that all overlaps happen properly.
    // Eventually, we should make distinct sets for each level.
    // Eventually, we should be able to handle more than one tail per bubble.
    for (let i = 0; i < elements.snapshotLength; i++) {
      const element = elements.snapshotItem(i) as HTMLElement;
      const bubble = new Bubble(element);
      if (bubble.spec.tips.length) {
        bubble.wrapBubbleWithTailAroundDiv(
          bubble.spec.style,
          bubble.spec.tips[0]
        );
      } else {
        bubble.wrapBubbleAroundDiv(bubble.spec.style);
      }
    }
  }

  public static convertBubbleJsonToCanvas(parent: HTMLElement) {
    const canvas = parent.ownerDocument!.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.classList.add("bubble-edit-generated");
    const oldSvg = parent.getElementsByClassName("bubble-edit-generated")[0];
    if (oldSvg) {
      oldSvg.parentElement!.insertBefore(canvas, oldSvg);
      oldSvg.remove();
    } else {
      parent.insertBefore(canvas, parent.firstChild); // want to use prepend, not in FF45.
    }
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    setup(canvas);
    Comical.update(parent);
  }

  public static bubbleVersion = "1.0";
}

// planned next steps
// 1. When we wrap a shape around an element, record the shape as the data-bubble attr, a block of json as indicted in the design doc.
// Tricks will be needed if it is an arbitrary SVG.
// 2. When a tail is attached or its key points moved, record tip and mid positions as properties in the data-bubble attr.
// 3. Add function ConvertSvgToCanvas(parent). Does more or less the opposite of ConvertCanvasToSvg,
// but using the data-X attributes of children of parent that have them to initialize the canvas paper elements.
// Enhance test code to make Finish button toggle between Save and Edit.
// (Once the logic to create a canvas as an overlay on a parent is in place, can probably get all the paper.js
// stuff out of the test code.)
