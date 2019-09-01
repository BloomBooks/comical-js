//import { document, console } from 'global';
import { storiesOf } from '@storybook/html';
import {setup, Path, Point, Color, Rectangle, project, Item} from "paper";
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
  })
  .add('svg shapes', () => {
    const canvas = document.createElement("canvas");
    setup(canvas);
    const speechBuble = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
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
           style="fill:#ffffff;stroke:#000000;stroke-width:0.26458332;stroke-opacity:1" />
      </g>
    </svg>`;
    // options.expandShapes = true might help
    // project!.importSVG(speechBuble, (item: Item) => {
    //   item.position = new Point(100,100);
    //   //const rectangles = item.getItems({class:Rectangle});
    //   // const rectangles = item.getItems((x: Item) => {
    //   //   return x.name && x.name.startsWith("rect");
    //   // });
    //   const rectangles = item.getItems((x: any) => {
    //     return x.shape ==="rectangle";
    //   });
    // const rectangles = item.getItems((x: any) => {
    //        return x.shape ==="rectangle";
    //      });
    project!.importSVG(speechBuble, {onLoad: (item:Item) => {
      // appears the test function is called twice. First item appears to be a
      // bounding rectangle at 0,0 with height and width 100. No name, strokeBounds null.
      // Second is the layer1 group.
      // Never called for the items generated from the circle and rectangle
        //  const rectangles = item.getItems((x: any) => {
        //   return x.name ==="content-holder";
        // });
        const contentHolder = item.getItem({recursive: true, match:(x: any) => {
          return x.name ==="content-holder";
        }});
        // contentHolder (which should be a rectangle in SVG) comes out as a Shape.
        // (can also cause it to come out as a Path, by setting expandShapes: true
        // in the getItem options).
        // It has property size, with height, width as numbers matching the
        // height and width specified in the SVG for the rectangle.)
        // Also position, which surprisingly is about 50,50...probably a center.
        contentHolder.fillColor = new Color("cyan");
      }
    });
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
    const tip = start.add(new Point(200, -50));
    const oval1 = new Path.Ellipse(new Rectangle(new Point(80, 10), new Point(180, 70)));
    const oval2 = new Path.Ellipse(new Rectangle(new Point(100, 50), new Point(300, 150)));
    BubbleEdit.drawTailOnShapes(start, tip,[oval1, oval2]);
    return canvas;
  })