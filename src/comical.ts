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
import { uniqueIds } from "./uniqueId";

export default class Comical {
  static backColor = new Color("white");



  private static getShape(
  
  // Call this when we are done editing bubbles on a particular parent
  // element. It replaces the canvas on which we've been editing
  // bubbles with an svg that has the same appearance.
  // (Note that this is not exactly reversable. We don't have a way
  // to convert back from SVG to bubbles. Rather, as we edit the
  // bubbles, we keep their data-bubble attributes up to date.
  // This provides the information for convertBubbleJsonToCanvas
  // to convert back from SVG state to an editable canvas.)
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
  public static update(parent: HTMLElement) { // parent represents the image
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
      const bubble = Comical.getBubbleSpec(element);
      if (bubble.tips.length) {
        Comical.wrapBubbleAroundDivWithTail(
          bubble.style,
          element,
          bubble.tips[0]
        );
      } else {
        Comical.wrapBubbleAroundDiv(bubble.style, element, () => {});
      }
    }
  }

  }
  // Call this to start the bubble editing process for a particular parent
  // element, typically one displaying one image on which we want bubbles,
  // and commonly already having a number of child elements which may have
  // BubbleSpecs stored in their data-bubble attributes. This method creates
  // a canvas for the bubbles to live in while being edited. If there is an
  // svg previously created as the non-editing state of the bubbles, it gets
  // removed. A bubble is created for each child element that has a data-bubble.
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

  public static getDefaultBubble(
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
      tips: [Comical.makeDefaultTip(element)],
      level: 1
    };
  }

  public static setBubble(
    bubble: BubbleSpec | undefined,
    element: HTMLElement
  ): void {
    if (bubble) {
      console.assert(
        !!(bubble.version && bubble.level && bubble.tips && bubble.style),
        "Bubble lacks minimum fields"
      );
      const json = JSON.stringify(bubble);
      const escapedJson = json.replace(/"/g, "`");
      element.setAttribute("data-bubble", escapedJson);
    } else {
      element.removeAttribute("data-bubble");
    }
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
