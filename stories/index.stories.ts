//import { document, console } from 'global';
import { storiesOf } from '@storybook/html';
import {setup, Path, Point, Color, Rectangle, project, Item, Shape} from "paper";
import BubbleEdit from "../src/bubbleEdit";

storiesOf('Demo', module)
  .add('heading', () => '<h1>Hello World</h1>')
  .add('button', () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerText = 'Hello Button';
    button.addEventListener('click', e => console.log(e));
    return button;
  });
storiesOf('paper', module)
  .add('line', () => {
    const canvas = document.createElement("canvas");
    setup(canvas);
    const path = new Path();
    path.strokeColor = new Color("black");
    const start = new Point(100,100);
    path.moveTo(start);
    path.lineTo(start.add(new Point(200, -50)));
    //view.play();
    return canvas;
  });
  
storiesOf('bubble-edit', module)
  .add('drag tail', () => {
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    setup(canvas);
    const start = new Point(100,100);
    const tip = start.add(new Point(200, -50));
    BubbleEdit.drawTail(start, tip);
    return canvas;
  })
  .add('tail on bubbles', () => {
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    setup(canvas);
    const start = new Point(200,100);
    const tip = start.add(new Point(200, 50));
    const oval1 = new Path.Ellipse(new Rectangle(new Point(80, 10), new Point(180, 70)));
    const oval2 = new Path.Ellipse(new Rectangle(new Point(100, 50), new Point(300, 150)));
    BubbleEdit.drawTailOnShapes(start, tip,[oval1, oval2]);
    return canvas;
  })
  .add('svg shapes', () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    wrapDiv.appendChild(canvas);
    setup(canvas);

    const textDiv = document.createElement("div");
    textDiv.innerText="This is a block of text to wrap around. It is 150px wide.";
    textDiv.style.width = "150px";
    textDiv.style.textAlign = "center";
    //textDiv.style.backgroundColor = "yellow";
    textDiv.style.position = "absolute";
    textDiv.style.top = "50px";
    textDiv.style.left = "80px";
    wrapDiv.appendChild(textDiv);

    const textDiv2 = document.createElement("div");
    textDiv2.innerText="This is another text block to wrap around. It is 200px wide. It has a bit more text to make it squarer.";
    textDiv2.style.width = "200px";
    textDiv2.style.textAlign = "center";
    //textDiv2.style.backgroundColor = "pink";
    textDiv2.style.position = "absolute";
    textDiv2.style.top = "250px";
    textDiv2.style.left = "120px";
    wrapDiv.appendChild(textDiv2);
    
    project!.importSVG(speechBubble(), {onLoad: (item:Item) => {
        BubbleEdit.wrapBubbleAroundDiv(item as Shape, textDiv, () => {});
      }
    });

    project!.importSVG(shoutBubble(), {onLoad: (item2:Item) => {
        BubbleEdit.wrapBubbleAroundDiv(item2 as Shape, textDiv2, () => {});
      }
    });
    return wrapDiv;
  })
  .add('shout with tail', () => {
    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    const canvas = document.createElement("canvas");
    canvas.height = 500;
    canvas.width = 500;
    wrapDiv.appendChild(canvas);
    setup(canvas);

    const textDiv2 = document.createElement("div");
    textDiv2.innerText="This is a text block meant to represent shouting. It is 200px wide. It has a bit more text to make it squarer.";
    textDiv2.style.width = "200px";
    textDiv2.style.textAlign = "center";
    //textDiv2.style.backgroundColor = "pink";
    textDiv2.style.position = "absolute";
    textDiv2.style.top = "250px";
    textDiv2.style.left = "120px";
    wrapDiv.appendChild(textDiv2);

    project!.importSVG(shoutBubble(), {onLoad: (item2:Item) => {
        BubbleEdit.wrapBubbleAroundDivWithTail(item2 as Shape, textDiv2);
      }
    });
    return wrapDiv;
  });

  function speechBubble() {
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

  function shoutBubble() {
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
