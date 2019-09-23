//import { document, console } from 'global';
import { storiesOf } from "@storybook/html";
import { setup, Path, Point, Color, Rectangle } from "paper";
import Comical from "../src/comical";
import { BubbleSpec } from "../src/bubbleSpec";

storiesOf("Demo", module)
  .add("heading", () => "<h1>Hello World</h1>")
  .add("button", () => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerText = "Hello Button";
    button.addEventListener("click", e => console.log(e));
    return button;
  });
storiesOf("paper", module).add("line", () => {
  const canvas = document.createElement("canvas");
  setup(canvas);
  const path = new Path();
  path.strokeColor = new Color("black");
  const start = new Point(100, 100);
  path.moveTo(start);
  path.lineTo(start.add(new Point(200, -50)));
  //view.play();
  return canvas;
});

storiesOf("bubble-edit", module)
  .add("drag tail", () => {
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    setup(canvas);
    const start = new Point(100, 100);
    const tip = start.add(new Point(200, -50));
    Comical.drawTail(start, Comical.defaultMid(start, tip), tip);
    return canvas;
  })
  .add("tail on bubbles", () => {
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    setup(canvas);
    const start = new Point(200, 100);
    const tip = start.add(new Point(200, 50));
    const oval1 = new Path.Ellipse(
      new Rectangle(new Point(80, 10), new Point(180, 70))
    );
    const oval2 = new Path.Ellipse(
      new Rectangle(new Point(100, 50), new Point(300, 150))
    );
    Comical.drawTailOnShapes(start, Comical.defaultMid(start, tip), tip, [
      oval1,
      oval2
    ]);
    return canvas;
  })
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

    Comical.wrapBubbleAroundDiv("speech", textDiv, () => {});
    Comical.wrapBubbleAroundDiv("shout", textDiv2, () => {});

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

    Comical.wrapBubbleAroundDivWithTail("shout", textDiv2);
    addFinishButton(wrapDiv);
    return wrapDiv;
  })
  .add("two bubbles on picture", () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.background = "url('7.jpg') no-repeat 0/800px";
    wrapDiv.style.height = "600px";

    var div1 = makeTextBlock(wrapDiv, "Oh no! He's dead!", 180, 40, 100);

    var div2 = makeTextBlock(
      wrapDiv,
      "The oxen stubled! The ark was falling! He touched it! How could God do such a thing?",
      380,
      50,
      200
    );

    // MakeDefaultTip() needs to see the divs laid out in their eventual positions,
    // as does convertBubbleJsonToCanvas.
    window.setTimeout(() => {
      var bubble: BubbleSpec = {
        version: "1.0",
        style: "speech",
        tips: [Comical.makeDefaultTip(div1)],
        level: 1
      };
      Comical.setBubble(bubble, div1);
      var bubble: BubbleSpec = {
        version: "1.0",
        style: "speech",
        tips: [Comical.makeDefaultTip(div2)],
        level: 1
      };
      Comical.setBubble(bubble, div2);
      Comical.convertBubbleJsonToCanvas(wrapDiv);
    }, 200);

    const button = addFinishButton(wrapDiv);
    // I can't get the button to respond to clicks if it overlays the canvas, so force it below the wrapDiv.
    button.style.position = "absolute";
    button.style.top = "600px";
    button.style.left = "0";
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
