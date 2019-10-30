//import { document, console } from 'global';
import { storiesOf } from "@storybook/html";
import {
  setup,
  Point,
  project,
  Layer,
  //Path,
  Color,
  //Rectangle,
  Item,
  Shape
} from "paper";
import { Comical } from "../src/comical";
import { Bubble } from "../src/bubble";
import { ArcTail } from "../src/arcTail";
import { LineTail } from "../src/lineTail";

storiesOf("comical", module)
  .add("export gradient svg of scaled group broken", () => {
    // const wrapDiv = document.createElement("div");
    // const canvas = document.createElement("canvas");
    // canvas.height = 200;
    // canvas.width = 200;
    // setup(canvas);
    // wrapDiv.appendChild(canvas);
    // const circle = new Path.Rectangle(new Rectangle(40, 40, 120, 120));
    // const color = {
    //   gradient: {
    //     stops: ["white", "yellow", "cyan"]
    //   },
    //   origin: new Point(100, 50),
    //   destination: new Point(100, 160)
    // };
    // circle.fillColor = (color as any) as Color;
    // circle.scale(0.8, 0.5);
    // const svg = project!.exportSVG() as SVGElement;
    // wrapDiv.appendChild(svg);
    // return wrapDiv;
    const wrapDiv = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.height = 200;
    canvas.width = 200;
    setup(canvas);
    wrapDiv.appendChild(canvas);
    const svgIn = Bubble.getShapeSvgString("caption");
    project!.importSVG(svgIn, {
      onLoad: (item: Item) => {
        const color = {
          gradient: {
            stops: ["white", "yellow", "cyan"]
          },
          origin: new Point(100, 0),
          destination: new Point(100, 60)
        };
        item.fillColor = (color as any) as Color;
        item.scale(0.8, 0.5);
      }
    });

    const svg = project!.exportSVG() as SVGElement;
    wrapDiv.appendChild(svg);
    return wrapDiv;
  })
  .add("export gradient fixed", () => {
    const wrapDiv = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.height = 200;
    canvas.width = 200;
    setup(canvas);
    wrapDiv.appendChild(canvas);
    const svgIn = Bubble.getShapeSvgString("caption");
    project!.importSVG(svgIn, {
      onLoad: (item: Item) => {
        const color = {
          gradient: {
            stops: ["white", "yellow", "cyan"]
          },
          origin: new Point(100, 0),
          destination: new Point(100, 60)
        };
        const outlineShape = item.getItem({
          recursive: true,
          match: (x: any) => x.name === "outlineShape"
        });
        item.remove();
        const outlinePath = (outlineShape as Shape).toPath();
        project!.activeLayer.addChild(outlinePath);
        outlinePath.fillColor = (color as any) as Color;
        outlinePath.scale(0.8, 0.5);
      }
    });

    const svg = project!.exportSVG() as SVGElement;
    wrapDiv.appendChild(svg);
    return wrapDiv;
  })
  // I don't think we need a story for the tail by itself any more
  .add("drag tail", () => {
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    setup(canvas);
    const start = new Point(100, 100);
    const tip = start.add(new Point(200, 150));
    const layer1 = project!.activeLayer;
    const layer2 = new Layer();
    const handleLayer = new Layer();
    project!.addLayer(layer2);
    project!.addLayer(handleLayer);
    const mid = Bubble.defaultMid(start, tip);
    const tail = new ArcTail(
      start,
      tip,
      mid,
      layer1,
      layer2,
      handleLayer,
      {
        tipX: tip.x!,
        tipY: tip.y!,
        midpointX: mid.x!,
        midpointY: mid.y!
      },
      undefined
    );
    tail.debugMode = true;
    tail.makeShapes();
    tail.showHandles();
    return canvas;
  })
  // Drop this test for now...drawing multiple connected shapes, including tails,
  // will come back eventually.
  // .add("tail on bubbles", () => {
  //   const canvas = document.createElement("canvas");
  //   canvas.height = 500;
  //   canvas.width = 500;
  //   setup(canvas);
  //   const start = new Point(200, 100);
  //   const tip = start.add(new Point(200, 50));
  //   const oval1 = new Path.Ellipse(
  //     new Rectangle(new Point(80, 10), new Point(180, 70))
  //   );
  //   const oval2 = new Path.Ellipse(
  //     new Rectangle(new Point(100, 50), new Point(300, 150))
  //   );
  //   Bubble.drawTailOnShapes(start, Bubble.defaultMid(start, tip), tip, [
  //     oval1,
  //     oval2
  //   ]);
  //   return canvas;
  // })
  .add("svg shapes", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    wrapDiv.appendChild(canvas);
    setup(canvas);

    const textDiv = document.createElement("div");
    textDiv.innerText =
      "This is a block of text to wrap around. It is 150px wide.";
    textDiv.style.width = "150px";
    textDiv.style.textAlign = "center";
    //textDiv.style.backgroundColor = "yellow";
    textDiv.style.position = "absolute";
    textDiv.style.top = "50px";
    textDiv.style.left = "80px";
    wrapDiv.appendChild(textDiv);
    const bubble1 = new Bubble(textDiv);

    const textDiv2 = document.createElement("div");
    textDiv2.innerText =
      "This is another text block to wrap around. It is 200px wide. It has a bit more text to make it squarer.";
    textDiv2.style.width = "200px";
    textDiv2.style.textAlign = "center";
    //textDiv2.style.backgroundColor = "pink";
    textDiv2.style.position = "absolute";
    textDiv2.style.top = "250px";
    textDiv2.style.left = "120px";
    wrapDiv.appendChild(textDiv2);
    const bubble2 = new Bubble(textDiv2);

    bubble1.setBubbleSpec({
      version: "1.0",
      style: "speech",
      tails: [],
      level: 1
    });

    bubble2.setBubbleSpec({
      version: "1.0",
      style: "shout",
      tails: [],
      level: 1
    });

    bubble1.initialize();
    bubble2.initialize();

    return wrapDiv;
  })
  .add("shout with tail", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.height = "600px";
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    wrapDiv.appendChild(canvas);
    setup(canvas);

    const textDiv2 = document.createElement("div");
    textDiv2.innerText =
      "This is a text block meant to represent shouting. It is 200px wide. It has a bit more text to make it squarer.";
    textDiv2.style.width = "200px";
    textDiv2.style.textAlign = "center";
    //textDiv2.style.backgroundColor = "pink";
    textDiv2.style.position = "absolute";
    textDiv2.style.top = "250px";
    textDiv2.style.left = "120px";
    wrapDiv.appendChild(textDiv2);

    const bubble = new Bubble(textDiv2);
    bubble.setBubbleSpec({
      version: "1.0",
      style: "shout",
      tails: [{ tipX: 420, tipY: 400, midpointX: 320, midpointY: 375 }],
      level: 1
    });
    setTimeout(() => {
      bubble.initialize();
    }, 200);
    addFinishButton(wrapDiv);
    return wrapDiv;
  })
  .add("Save and reload test", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.height = "300px";
    const canvas = document.createElement("canvas");
    canvas.height = 300;
    canvas.width = 500;
    wrapDiv.appendChild(canvas);
    setup(canvas);

    const textDiv2 = document.createElement("div");
    textDiv2.innerText =
      'Move the tail, click the "Save and Reload" button, and make sure the tail stays in the same place';
    textDiv2.style.width = "200px";
    textDiv2.style.textAlign = "center";
    textDiv2.style.position = "absolute";
    textDiv2.style.top = "50px";
    textDiv2.style.left = "120px";
    wrapDiv.appendChild(textDiv2);

    let bubble = new Bubble(textDiv2);
    bubble.setBubbleSpec({
      version: "1.0",
      style: "shout",
      tails: [{ tipX: 220, tipY: 250, midpointX: 220, midpointY: 175 }],
      level: 1
    });

    setTimeout(() => {
      bubble.initialize();
    }, 200);

    addButton(wrapDiv, "Save and Reload", () => {
      bubble = new Bubble(textDiv2);
      Comical.update(wrapDiv);
    });
    return wrapDiv;
  })
  .add("two bubbles on picture", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.background =
      "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
    wrapDiv.style.height = "600px";

    var div1 = makeTextBlock(wrapDiv, "Sweet! Rad glasses!", 120, 100, 100);

    var div2 = makeTextBlock(
      wrapDiv,
      //"The oxen stumbled! The ark was falling! He touched it! How could God do such a thing?",
      "I got a blue hat. I love it! Better not lose it...",
      300,
      150,
      200
    );
    div2.setAttribute("contenteditable", "true");

    // MakeDefaultTip() needs to see the divs laid out in their eventual positions,
    // as does convertBubbleJsonToCanvas.
    window.setTimeout(() => {
      const bubble1 = new Bubble(div1);
      var tail = Bubble.makeDefaultTail(div1);
      tail.style = "straight";
      bubble1.setBubbleSpec({
        version: "1.0",
        style: "speech",
        tails: [tail],
        level: 1
      });

      const bubble2 = new Bubble(div2);
      bubble2.setBubbleSpec({
        version: "1.0",
        style: "speech",
        tails: [Bubble.makeDefaultTail(div2)],
        level: 1
      });
      Comical.convertBubbleJsonToCanvas(wrapDiv);
    }, 200);

    const button = addFinishButton(wrapDiv);
    // I can't get the button to respond to clicks if it overlays the canvas, so force it below the wrapDiv.
    button.style.position = "absolute";
    button.style.top = "600px";
    button.style.left = "0";
    return wrapDiv;
  })
  .add("two captions on picture", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.background =
      "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
    wrapDiv.style.height = "600px";

    var div1 = makeTextBlock(
      wrapDiv,
      "Joe got some fancy glasses",
      120,
      100,
      100
    );

    var div2 = makeTextBlock(
      wrapDiv,
      "Bill got a blue hat that he really loves",
      300,
      150,
      200
    );
    div2.setAttribute("contenteditable", "true");

    // convertBubbleJsonToCanvas needs to see the divs laid out in their eventual positions
    window.setTimeout(() => {
      const bubble1 = new Bubble(div1);
      bubble1.setBubbleSpec({
        version: "1.0",
        style: "caption",
        tails: [],
        level: 1,
        backgroundColors: ["white", "yellow", "cyan"]
      });

      const bubble2 = new Bubble(div2);
      bubble2.setBubbleSpec({
        version: "1.0",
        style: "caption",
        tails: [],
        level: 1,
        backgroundColors: ["#FFFFFF", "#DFB28B"],
        shadowOffset: 5
      });
      Comical.convertBubbleJsonToCanvas(wrapDiv);
    }, 200);

    const button = addFinishButton(wrapDiv);
    // I can't get the button to respond to clicks if it overlays the canvas, so force it below the wrapDiv.
    button.style.position = "absolute";
    button.style.top = "600px";
    button.style.left = "0";
    return wrapDiv;
  })
  .add("overlapping bubbles", () => {
    // A generic picture
    // Two bubbles that are merged together (at the same layer)
    // Overlapping non-merged bubbles
    // Multiple tails on a bubble
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.background =
      "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
    wrapDiv.style.height = "600px";

    var div1 = makeTextBlock(
      wrapDiv,
      "This should be the highest layer",
      130,
      80,
      100
    );
    var div2 = makeTextBlock(
      wrapDiv,
      "This should be the lowest layer",
      130,
      150,
      100
    );

    var div3 = makeTextBlock(
      wrapDiv,
      "This should be the middle layer",
      250,
      80,
      200
    );
    var div4 = makeTextBlock(
      wrapDiv,
      "This should be merged with the other middle layer",
      250,
      130,
      100
    );

    const divSelected = document.createElement("div");
    wrapDiv.appendChild(divSelected);
    divSelected.innerText = "content of selected element copied here";
    Comical.setActiveBubbleListener(div => {
      if (div) {
        divSelected!.innerText = div.innerText;
      } else {
        divSelected.innerText = "nothing selected";
      }
    });

    // MakeDefaultTip() needs to see the divs laid out in their eventual positions,
    // as does convertBubbleJsonToCanvas.
    window.setTimeout(() => {
      const bubble1 = new Bubble(div1);
      bubble1.setBubbleSpec({
        version: "1.0",
        style: "speech",
        tails: [{ tipX: 400, tipY: 250, midpointX: 350, midpointY: 200 }], // Drawn to go over one of the middle bubbles
        level: 3
      });

      const bubble2 = new Bubble(div2);
      bubble2.setBubbleSpec({
        version: "1.0",
        style: "speech",
        tails: [{ tipX: 450, tipY: 200, midpointX: 350, midpointY: 200 }], // Drawn to go under the tail of the highest layer
        level: 1
      });

      const bubble3 = new Bubble(div3);
      bubble3.setBubbleSpec({
        version: "1.0",
        style: "speech",
        tails: [Bubble.makeDefaultTail(div3)],
        level: 2
      });

      const bubble4 = new Bubble(div4);
      bubble4.setBubbleSpec({
        version: "1.0",
        style: "speech",
        // Give this one a non-default tip so it starts out intersecting the previous bubble.
        // This lets us easily check on a later tail overlapping an earlier bubble in the same
        // level (though as a cartoon it looks a bit odd...a more plausible comic might have
        // a bubble with no tail overlapping one with a tail that merges into a third which has a
        // regular tail.)
        tails: [{ tipX: 470, tipY: 100, midpointX: 370, midpointY: 150 }],
        level: 2
      });

      Comical.convertBubbleJsonToCanvas(wrapDiv);
    }, 200);

    const button = addFinishButton(wrapDiv);
    // Force it below the wrapDiv.
    button.style.position = "absolute";
    button.style.top = "600px";
    button.style.left = "0";

    return wrapDiv;
  })
  .add("Change bubble style test", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.height = "300px";
    const canvas = document.createElement("canvas");
    canvas.height = 300;
    canvas.width = 500;
    wrapDiv.appendChild(canvas);
    setup(canvas);

    const textDiv2 = document.createElement("div");
    textDiv2.innerText =
      "Change the bubble style to None and make sure the tail goes away";
    textDiv2.style.width = "200px";
    textDiv2.style.textAlign = "center";
    textDiv2.style.position = "absolute";
    textDiv2.style.top = "50px";
    textDiv2.style.left = "120px";
    wrapDiv.appendChild(textDiv2);

    let bubble = new Bubble(textDiv2);
    bubble.setBubbleSpec({
      version: "1.0",
      style: "shout",
      tails: [{ tipX: 220, tipY: 250, midpointX: 220, midpointY: 175 }],
      level: 1
    });

    setTimeout(() => {
      Comical.update(wrapDiv);
    }, 200);

    addButton(wrapDiv, "None", () => {
      const spec = Bubble.getBubbleSpec(textDiv2);
      spec.style = "none";
      bubble.setBubbleSpec(spec);
      Comical.update(wrapDiv);
    });
    addButton(wrapDiv, "Speech", () => {
      const spec = Bubble.getBubbleSpec(textDiv2);
      spec.style = "speech";
      bubble.setBubbleSpec(spec);
      Comical.update(wrapDiv);
    });
    addButton(wrapDiv, "Shout", () => {
      const spec = Bubble.getBubbleSpec(textDiv2);
      spec.style = "shout";
      bubble.setBubbleSpec(spec);
      Comical.update(wrapDiv);
    });

    const button = addFinishButton(wrapDiv);
    // Force it below the wrapDiv.
    button.style.position = "absolute";
    button.style.top = "400px";
    button.style.left = "0";

    return wrapDiv;
  })
  .add("Multiple tails", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.height = "300px";
    const canvas = document.createElement("canvas");
    canvas.height = 300;
    canvas.width = 500;
    wrapDiv.appendChild(canvas);
    setup(canvas);

    const textDiv2 = document.createElement("div");
    textDiv2.innerText =
      "This box should have 2 tails. Try moving the left tail, click Finish, click Edit. Ensure that neither tail (especially the right one!) moves upon clicking Edit.";
    textDiv2.style.width = "200px";
    textDiv2.style.textAlign = "center";
    textDiv2.style.position = "absolute";
    textDiv2.style.top = "50px";
    textDiv2.style.left = "120px";
    wrapDiv.appendChild(textDiv2);

    let bubble = new Bubble(textDiv2);
    bubble.setBubbleSpec({
      version: "1.0",
      style: "speech",
      tails: [
        { tipX: 300, tipY: 250, midpointX: 250, midpointY: 175 },
        { tipX: 100, tipY: 250, midpointX: 150, midpointY: 175 }
      ],
      level: 1
    });

    setTimeout(() => {
      Comical.update(wrapDiv);
    }, 200);

    const button = addFinishButton(wrapDiv);
    // Force it below the wrapDiv.
    button.style.position = "absolute";
    button.style.top = "400px";
    button.style.left = "0";

    return wrapDiv;
  })
  .add("child bubbles", () => {
    // A generic picture
    // Four bubbles in the same layer, two overlapping
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.background =
      "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
    wrapDiv.style.height = "600px";

    var div1 = makeTextBlock(wrapDiv, "Top left, last in chain", 30, 40, 100);
    var div2 = makeTextBlock(
      wrapDiv,
      "Top right, third in chain, a bit bigger",
      280,
      50,
      150
    );

    var div3 = makeTextBlock(
      wrapDiv,
      "Lower right, overlaps top right",
      250,
      100,
      100
    );
    var div4 = makeTextBlock(wrapDiv, "Lower left, parent", 120, 180, 100);

    // MakeDefaultTip() needs to see the divs laid out in their eventual positions,
    // as does convertBubbleJsonToCanvas.
    window.setTimeout(() => {
      // the parent div
      const bubble4 = new Bubble(div4);
      bubble4.setBubbleSpec({
        version: "1.0",
        style: "speech",
        tails: [Bubble.makeDefaultTail(div4)],
        level: 2,
        backgroundColors: ["white", "yellow", "cyan"]
      });
      // To get the right behaviour from initializeChild,
      // convertCanvasToSvgImg must have been called with
      // all the previous bubbles in the family defined.
      // So we turn it off and on again between each call.
      Comical.convertBubbleJsonToCanvas(wrapDiv);
      Comical.initializeChild(div3, div4);
      Comical.convertCanvasToSvgImg(wrapDiv);
      Comical.convertBubbleJsonToCanvas(wrapDiv);
      Comical.initializeChild(div2, div3);
      Comical.convertCanvasToSvgImg(wrapDiv);
      Comical.convertBubbleJsonToCanvas(wrapDiv);
      Comical.initializeChild(div1, div4);
      Comical.convertCanvasToSvgImg(wrapDiv);
      Comical.convertBubbleJsonToCanvas(wrapDiv);
    }, 200);

    const button = addFinishButton(wrapDiv);
    // Force it below the wrapDiv.
    button.style.position = "absolute";
    button.style.top = "600px";
    button.style.left = "0";

    const buttonLeft = addButton(wrapDiv, "Click to move box left", () => {
      div4.style.left = "50px";
    });
    const buttonRight = addButton(wrapDiv, "Click to move box right", () => {
      div4.style.left = "250px";
    });
    buttonLeft.style.position = "absolute";
    buttonLeft.style.top = "600px";
    buttonLeft.style.left = "100px";

    buttonRight.style.position = "absolute";
    buttonRight.style.top = "600px";
    buttonRight.style.left = "300px";

    let toggle = false;
    const buttonThird = addButton(wrapDiv, "Click to move middle box", () => {
      if (toggle) {
        div3.style.left = "250px";
        div3.style.top = "100px";
      } else {
        div3.style.left = "350px";
        div3.style.top = "150px";
      }
      toggle = !toggle;
    });

    buttonThird.style.position = "absolute";
    buttonThird.style.top = "600px";
    buttonThird.style.left = "500px";

    return wrapDiv;
  })
  .add("Move content element", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.height = "300px";

    const instructionsDiv = document.createElement("div");
    instructionsDiv.innerText =
      "Click the button to move the content element to the right. Then adjust the mid handle. Make sure the tail root goes to the new start, not the original start.";
    instructionsDiv.style.width = "600px";
    instructionsDiv.style.position = "absolute";
    instructionsDiv.style.top = "0px";
    instructionsDiv.style.left = "0px";
    wrapDiv.appendChild(instructionsDiv);

    const canvas = document.createElement("canvas");
    canvas.height = 300;
    canvas.width = 600;
    wrapDiv.appendChild(canvas);
    setup(canvas);

    const textDiv1 = document.createElement("div");
    textDiv1.innerText = "Text";
    textDiv1.style.width = "50px";
    textDiv1.style.textAlign = "center";
    textDiv1.style.position = "absolute";
    textDiv1.style.top = "50px";
    textDiv1.style.left = "200px";
    wrapDiv.appendChild(textDiv1);

    setTimeout(() => {
      let bubble = new Bubble(textDiv1);
      bubble.setBubbleSpec({
        version: "1.0",
        style: "speech",
        tails: [{ tipX: 300, tipY: 275, midpointX: 300, midpointY: 225 }],
        level: 1
      });

      Comical.update(wrapDiv);
    }, 200);

    const buttonLeft = addButton(wrapDiv, "Click to move box left", () => {
      textDiv1.style.left = "100px";
    });
    const buttonRight = addButton(wrapDiv, "Click to move box right", () => {
      textDiv1.style.left = "300px";
    });
    // Force it below the wrapDiv.
    buttonLeft.style.position = "absolute";
    buttonLeft.style.top = "400px";
    buttonLeft.style.left = "0";

    buttonRight.style.position = "absolute";
    buttonRight.style.top = "400px";
    buttonRight.style.left = "200px";

    return wrapDiv;
  })
  .add("single-pixel line tail", () => {
    const canvas = document.createElement("canvas");
    canvas.height = 600;
    canvas.width = 600;
    setup(canvas);

    const start = new Point(100, 100);
    const tip = start.add(new Point(200, 150));
    const layer1 = project!.activeLayer;
    const layer2 = new Layer();
    const handleLayer = new Layer();
    project!.addLayer(layer2);
    project!.addLayer(handleLayer);
    const mid = Bubble.defaultMid(start, tip);

    const tail = new LineTail(
      start,
      tip,
      layer1,
      layer2,
      handleLayer,
      {
        tipX: tip.x!,
        tipY: tip.y!,
        midpointX: mid.x!,
        midpointY: mid.y!
      },
      undefined
    );
    tail.debugMode = true;
    tail.makeShapes();
    tail.showHandles();
    return canvas;
  })

  .add("single-pixel tail on picture", () => {
    const wrapDiv = document.createElement("div");

    wrapDiv.style.position = "relative";
    wrapDiv.style.background =
      "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
    wrapDiv.style.height = "600px";

    const canvas = document.createElement("canvas");
    canvas.width = wrapDiv.clientWidth;
    canvas.height = wrapDiv.clientHeight;
    setup(canvas);

    wrapDiv.appendChild(canvas);

    var div1 = makeTextBlock(
      wrapDiv,
      "How do you like my fancy glasses?",
      120,
      100,
      100
    );

    window.setTimeout(() => {
      const bubble1 = new Bubble(div1);
      var tail = Bubble.makeDefaultTail(div1);
      tail.style = "line";
      bubble1.setBubbleSpec({
        version: "1.0",
        style: "caption",
        tails: [tail],
        level: 1,
        backgroundColors: ["#fff", "#839496"],
        shadowOffset: 1
      });
      Comical.convertBubbleJsonToCanvas(wrapDiv);
    }, 200);

    return wrapDiv;
  });

function makeTextBlock(
  parent: HTMLElement,
  content: string,
  x: number,
  y: number,
  width: number
): HTMLElement {
  const textDiv = document.createElement("div");
  textDiv.innerText = content;
  textDiv.style.width = `${width}px`;
  textDiv.style.textAlign = "center";
  textDiv.style.position = "absolute";
  textDiv.style.top = `${y}px`;
  textDiv.style.left = `${x}px`;
  textDiv.style.zIndex = "1";
  parent.appendChild(textDiv);
  return textDiv;
}

function addFinishButton(wrapDiv: HTMLElement): HTMLButtonElement {
  const button = document.createElement("button");
  button.title = "Finish";
  button.innerText = "Finish";
  button.style.zIndex = "100";
  wrapDiv.appendChild(button);
  let editable = true;
  button.addEventListener("click", () => {
    if (editable) {
      Comical.convertCanvasToSvgImg(wrapDiv);
      editable = false;
      button.innerText = "Edit";
    } else {
      Comical.convertBubbleJsonToCanvas(wrapDiv);
      editable = true;
      button.innerText = "Finish";
    }
  });
  return button;
}

function addButton(
  wrapDiv: HTMLElement,
  buttonText: string,
  clickHandler: () => void
): HTMLButtonElement {
  wrapDiv.appendChild(document.createElement("br"));
  const button = document.createElement("button");
  button.title = buttonText;
  button.innerText = buttonText;
  button.style.zIndex = "100";
  wrapDiv.appendChild(button);
  button.addEventListener("click", () => {
    clickHandler();
  });
  return button;
}
