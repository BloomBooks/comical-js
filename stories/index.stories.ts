//import { document, console } from 'global';
import { storiesOf } from "@storybook/html";
import paper = require("paper"); // Note!!! Because paper.d.ts uses "export = ..." syntax, we must use "import ... = require(...);" syntax. Otherwise, paper will be null and you'll get exceptions or silent unexpected behavior
import { Comical } from "../src/comical";
import { Bubble } from "../src/bubble";
import { ArcTail } from "../src/arcTail";
import { LineTail } from "../src/lineTail";
import { TailSpec } from "../src/bubbleSpec";
import { startDragging } from "./bubbleDrag";
storiesOf("paper", module)
    // Please keep this test case, it is being used to document a Paper.js problem.
    .add("playing with scale", () => {
        const wrapDiv = document.createElement("div");
        // Make a demo canvas
        const makeCanvas = (color: paper.Color, parent: HTMLElement) => {
            const canvas1 = document.createElement("canvas");
            canvas1.height = canvas1.width = 300;
            parent.appendChild(canvas1);
            paper.setup(canvas1);
            const project1 = paper.project!;
            //Give it a colored background so mouseDown works on the layer.
            var background = new paper.Path.Rectangle(new paper.Point(0, 0), new paper.Point(300, 300));
            background.fillColor = color;
            // mouse down on the canvas adds a dot to show where you clicked.
            project1.activeLayer.onMouseDown = (event: paper.ToolEvent) => {
                project1.activate();
                var path = new paper.Path.Circle({
                    center: event.point,
                    radius: 3,
                    fillColor: new paper.Color("red")
                });
                // if you click on the dot it should draw another circle around it
                path.onMouseDown = () => {
                    paper.project;
                    const path2 = new paper.Path.Circle({
                        center: path.position,
                        radius: 6,
                        strokeColor: new paper.Color("blue")
                    });
                    path2.strokeWidth = 2;
                };
            };
        };
        // at normal scale all is well.
        makeCanvas(new paper.Color("yellow"), wrapDiv);

        // now make another canvas that is transformed.
        const wrap2 = document.createElement("div");
        wrapDiv.appendChild(wrap2);
        wrap2.style.transform = "scale(1.3)";
        wrap2.style.transformOrigin = "left top";
        makeCanvas(new paper.Color("pink"), wrap2);

        return wrapDiv;
    })
    .add("playing with beziers", () => {
        const wrapDiv = document.createElement("div");
        const canvas = document.createElement("canvas");
        canvas.height = 600;
        canvas.width = 600;
        var xhandleFraction = 0.6;
        var yHandleFraction = 0.8;
        paper.setup(canvas);
        wrapDiv.appendChild(canvas);
        const makePath = () => {
            const top = 50;
            const left = 50;
            const height = 80;
            const width = 200;
            const xCenter = left + width / 2;
            const yCenter = top + height / 2;
            const right = left + width;
            const bottom = top + height;
            const xHandleOffset = (width / 2) * xhandleFraction;
            const yHandleOffset = (height / 2) * yHandleFraction;
            var firstSegment = new paper.Segment({
                point: new paper.Point(xCenter, top),
                handleOut: new paper.Point(xHandleOffset, 0),
                handleIn: new paper.Point(-xHandleOffset, 0)
            });
            var secondSegment = new paper.Segment({
                point: new paper.Point(right, yCenter),
                handleIn: new paper.Point(0, -yHandleOffset),
                handleOut: new paper.Point(0, yHandleOffset)
            });
            var thirdSegment = new paper.Segment({
                point: new paper.Point(xCenter, bottom),
                handleIn: new paper.Point(xHandleOffset, 0),
                handleOut: new paper.Point(-xHandleOffset, 0)
            });
            var fourthSegment = new paper.Segment({
                point: new paper.Point(left, yCenter),
                handleIn: new paper.Point(0, yHandleOffset),
                handleOut: new paper.Point(0, -yHandleOffset)
            });
            const path = new paper.Path({
                segments: [firstSegment, secondSegment, thirdSegment, fourthSegment],
                strokeColor: new paper.Color("black")
            });
            const topRightCurve = path.curves[0];
            const topRight = topRightCurve.getLocationAt((topRightCurve.length * width) / (width + height)).point;
            const bottomLeftCurve = path.curves[2];
            const bottomLeft = bottomLeftCurve.getLocationAt((bottomLeftCurve.length * width) / (width + height)).point;
            const contentHolder = new paper.Path.Rectangle(topRight, bottomLeft);
            contentHolder.strokeColor = new paper.Color("red");

            path.fullySelected = true;
            path.closed = true;
        };
        makePath();

        const button = document.createElement("button");
        button.title = "Tighter";
        button.innerText = "Tighter";
        button.style.zIndex = "100";
        button.style.marginRight = "10px";
        wrapDiv.appendChild(button);
        button.addEventListener("click", () => {
            xhandleFraction += 0.03;
            paper.project!.activeLayer.removeChildren();
            makePath();
        });

        const looser = document.createElement("button");
        looser.title = "Looser";
        looser.innerText = "Looser";
        looser.style.zIndex = "100";
        wrapDiv.appendChild(looser);
        looser.addEventListener("click", () => {
            xhandleFraction -= 0.03;
            paper.project!.activeLayer.removeChildren();
            makePath();
        });

        return wrapDiv;
    })
    .add("export gradient svg of scaled group broken", () => {
        // const wrapDiv = document.createElement("div");
        // const canvas = document.createElement("canvas");
        // canvas.height = 200;
        // canvas.width = 200;
        // paper.setup(canvas);
        // wrapDiv.appendChild(canvas);
        // const circle = new paper.Path.Rectangle(new Rectangle(40, 40, 120, 120));
        // const color = {
        //   gradient: {
        //     stops: ["white", "yellow", "cyan"]
        //   },
        //   origin: new paper.Point(100, 50),
        //   destination: new paper.Point(100, 160)
        // };
        // circle.fillColor = (color as any) as paper.Color;
        // circle.scale(0.8, 0.5);
        // const svg = paper.project!.exportSVG() as SVGElement;
        // wrapDiv.appendChild(svg);
        // return wrapDiv;
        const wrapDiv = document.createElement("div");
        const canvas = document.createElement("canvas");
        canvas.height = 200;
        canvas.width = 200;
        paper.setup(canvas);
        wrapDiv.appendChild(canvas);
        const svgIn = Bubble.getShapeSvgString("caption");
        paper.project!.importSVG(svgIn, {
            onLoad: (item: paper.Item) => {
                const color = {
                    gradient: {
                        stops: ["white", "yellow", "cyan"]
                    },
                    origin: new paper.Point(100, 0),
                    destination: new paper.Point(100, 60)
                };
                item.fillColor = (color as any) as paper.Color;
                item.scale(0.8, 0.5);
            }
        });

        const svg = paper.project!.exportSVG() as SVGElement;
        wrapDiv.appendChild(svg);
        return wrapDiv;
    })
    .add("export gradient fixed", () => {
        const wrapDiv = document.createElement("div");
        const canvas = document.createElement("canvas");
        canvas.height = 200;
        canvas.width = 200;
        paper.setup(canvas);
        wrapDiv.appendChild(canvas);
        const svgIn = Bubble.getShapeSvgString("caption");
        paper.project!.importSVG(svgIn, {
            onLoad: (item: paper.Item) => {
                const color = {
                    gradient: {
                        stops: ["white", "yellow", "cyan"]
                    },
                    origin: new paper.Point(100, 0),
                    destination: new paper.Point(100, 60)
                };
                const outlineShape = item.getItem({
                    recursive: true,
                    match: (x: any) => x.name === "outlineShape"
                });
                item.remove();
                const outlinePath = (outlineShape as paper.Shape).toPath();
                paper.project!.activeLayer.addChild(outlinePath);
                outlinePath.fillColor = (color as any) as paper.Color;
                outlinePath.scale(0.8, 0.5);
            }
        });

        const svg = paper.project!.exportSVG() as SVGElement;
        wrapDiv.appendChild(svg);
        return wrapDiv;
    });

storiesOf("comical/general", module)
    // I don't think we need a story for the tail by itself any more
    .add("drag tail", () => {
        const canvas = document.createElement("canvas");
        canvas.height = 500;
        canvas.width = 500;
        paper.setup(canvas);
        const start = new paper.Point(100, 100);
        const tip = start.add(new paper.Point(200, 150));
        const layer1 = paper.project!.activeLayer;
        const layer2 = new paper.Layer();
        const handleLayer = new paper.Layer();
        paper.project!.addLayer(layer2);
        paper.project!.addLayer(handleLayer);
        const mid = Bubble.defaultMid(start, tip, new paper.Size(0, 0));
        const tail = new ArcTail(
            start,
            tip,
            mid,
            layer1,
            layer2,
            handleLayer,
            {
                tipX: tip.x,
                tipY: tip.y,
                midpointX: mid.x,
                midpointY: mid.y
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
    //   paper.setup(canvas);
    //   const start = new paper.Point(200, 100);
    //   const tip = start.add(new paper.Point(200, 50));
    //   const oval1 = new paper.Path.Ellipse(
    //     new Rectangle(new paper.Point(80, 10), new paper.Point(180, 70))
    //   );
    //   const oval2 = new paper.Path.Ellipse(
    //     new Rectangle(new paper.Point(100, 50), new paper.Point(300, 150))
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
        paper.setup(canvas);

        const textDiv = document.createElement("div");
        textDiv.innerText = "This is a block of text to wrap around. It is 150px wide.";
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

        setTimeout(() => {
            // Need a timeout because these functions may need to know the width of the content box
            bubble1.initialize();
            bubble2.initialize();
        }, 200);

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
        paper.setup(canvas);

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
        paper.setup(canvas);

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
    .add("three bubbles on picture (scaled)", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.background = "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
        wrapDiv.style.height = "600px";
        wrapDiv.style.transform = "scale(1.3)";
        wrapDiv.style.transformOrigin = "left top";

        var div1 = makeTextBlock(wrapDiv, "Sweet! Rad glasses!", 20, 50, 100);

        var div2 = makeTextBlock(wrapDiv, "I got a blue hat. I love it! Better not lose it...", 100, 170, 200);
        div2.setAttribute("contenteditable", "true");

        var div3 = makeTextBlock(
            wrapDiv,
            "Yum! This tastes really good!  I want more and more and more...",
            300,
            50,
            100
        );
        div3.setAttribute("contenteditable", "true");

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
                level: 1,
                outerBorderColor: "red"
            });

            const bubble2 = new Bubble(div2);
            const tail2 = Bubble.makeDefaultTail(div2);
            // These settings actually make a somewhat ugly tail with one of our less
            // successful 'pucker' curves...we may try to improve it one day. But the main
            // reason for them is that they once produced a nasty drawing problem where the
            // tip of the tail was drawn well beyond the intended tip point.
            tail2.tipX = 250;
            tail2.tipY = 238;
            tail2.midpointX = 227.6;
            tail2.midpointY = 228.4;
            bubble2.setBubbleSpec({
                version: "1.0",
                style: "speech",
                tails: [tail2],
                level: 1,
                backgroundColors: ["rgba(255,200,255,0.5)"]
            });

            const bubble3 = new Bubble(div3);
            var tail3 = Bubble.makeDefaultTail(div3);
            bubble3.setBubbleSpec({
                version: "1.0",
                style: "thought",
                tails: [tail3],
                level: 1,
                backgroundColors: ["rgba(241,235,156,0.5)"]
            });
            Comical.convertBubbleJsonToCanvas(wrapDiv);
            startDragging(wrapDiv);
        }, 200);

        const button = addFinishButton(wrapDiv);
        // I can't get the button to respond to clicks if it overlays the canvas, so force it below the wrapDiv.
        button.style.position = "absolute";
        button.style.top = "600px";
        button.style.left = "0";
        return wrapDiv;
    })
    .add("circular bubbles", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.background = "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
        wrapDiv.style.height = "600px";
        //wrapDiv.style.transform = "scale(1.3)";
        wrapDiv.style.transformOrigin = "left top";

        var div1 = makeTextBlock(wrapDiv, "Sweet! Rad glasses!", 20, 50, 100);

        var div2 = makeTextBlock(wrapDiv, "I got a blue hat. I love it! Better not lose it...", 100, 170, 200);
        div2.setAttribute("contenteditable", "true");

        var div3 = makeTextBlock(
            wrapDiv,
            "Yum! This tastes really good!  I want more and more and more...",
            300,
            50,
            100
        );
        div3.setAttribute("contenteditable", "true");

        // MakeDefaultTip() needs to see the divs laid out in their eventual positions,
        // as does convertBubbleJsonToCanvas.
        window.setTimeout(() => {
            const bubble1 = new Bubble(div1);
            var tail = Bubble.makeDefaultTail(div1);
            tail.style = "straight";
            bubble1.setBubbleSpec({
                version: "1.0",
                style: "circle",
                tails: [tail],
                level: 1,
                outerBorderColor: "red"
            });

            const bubble2 = new Bubble(div2);
            const tail2 = Bubble.makeDefaultTail(div2);
            bubble2.setBubbleSpec({
                version: "1.0",
                style: "circle",
                tails: [tail2],
                level: 1,
                backgroundColors: ["rgba(255,200,255,0.5)"]
            });

            const bubble3 = new Bubble(div3);
            var tail3 = Bubble.makeDefaultTail(div3);
            bubble3.setBubbleSpec({
                version: "1.0",
                style: "circle",
                tails: [tail3],
                level: 1,
                backgroundColors: ["rgba(241,235,156,0.5)"]
            });
            Comical.convertBubbleJsonToCanvas(wrapDiv);
            startDragging(wrapDiv);
        }, 200);

        const button = addFinishButton(wrapDiv);
        // I can't get the button to respond to clicks if it overlays the canvas, so force it below the wrapDiv.
        button.style.position = "absolute";
        button.style.top = "600px";
        button.style.left = "0";
        return wrapDiv;
    })
    .add("rectangular bubble with background", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.background = "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
        wrapDiv.style.height = "600px";
        //wrapDiv.style.transform = "scale(1.3)";
        wrapDiv.style.transformOrigin = "left top";

        var div1 = makeTextBlock(wrapDiv, "This is a test of BL-11715", 20, 50, 100);

        div1.setAttribute("contenteditable", "true");

        // MakeDefaultTip() needs to see the divs laid out in their eventual positions,
        // as does convertBubbleJsonToCanvas.
        window.setTimeout(() => {
            const bubble1 = new Bubble(div1);

            bubble1.setBubbleSpec({
                version: "1.0",
                style: "none",
                tails: [],
                level: 1,
                backgroundColors: [`#60ee5a`],
                //shadowOffset: 0,
                cornerRadiusX: 8,
                cornerRadiusY: 8
            });

            Comical.convertBubbleJsonToCanvas(wrapDiv);
            startDragging(wrapDiv);
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
        wrapDiv.style.background = "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
        wrapDiv.style.height = "600px";

        var div1 = makeTextBlock(wrapDiv, "This should be the highest layer", 130, 80, 100);
        var div2 = makeTextBlock(wrapDiv, "This should be the lowest layer", 130, 150, 100);

        var div3 = makeTextBlock(wrapDiv, "This should be the middle layer", 240, 85, 200);
        var div4 = makeTextBlock(wrapDiv, "This should be merged with the other middle layer", 250, 130, 100);

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
            startDragging(wrapDiv);
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
        wrapDiv.style.width = "500px";
        wrapDiv.className = "wrapperDiv"; // just for debugging

        const textDiv2 = document.createElement("div");
        textDiv2.innerText = "Change the bubble style to None and make sure the tail goes away";
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
            Comical.startEditing([wrapDiv]);
        }, 200);

        // Using mergeWithNewBubbleProps here is a better test than just changing
        // the bubble spec and updating. But somehow it's not working quite like
        // it does in Bloom, because although the number of tails changes like
        // it should, we don't keep the existing tail position when not changing
        // the number. The problem doesn't seem to be in mergeWithNewBubbleProps;
        // rather, the dragged tail position is not making it into the spec. It
        // works right in Bloom, though.
        addButtonBelow(
            wrapDiv,
            "None",
            () => {
                bubble.mergeWithNewBubbleProps({ style: "none" });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "430px"
        );
        addButtonBelow(
            wrapDiv,
            "Speech",
            () => {
                bubble.mergeWithNewBubbleProps({ style: "speech" });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "460px"
        );
        addButtonBelow(
            wrapDiv,
            "Shout",
            () => {
                bubble.mergeWithNewBubbleProps({ style: "shout" });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "490px"
        );

        addButtonBelow(
            wrapDiv,
            "Exclamation",
            () => {
                bubble.mergeWithNewBubbleProps({ style: "pointedArcs" });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "520px"
        );

        addButtonBelow(
            wrapDiv,
            "Exclamation w. tail",
            () => {
                bubble.mergeWithNewBubbleProps({
                    style: "pointedArcs",
                    tails: [{ tipX: 220, tipY: 250, midpointX: 220, midpointY: 175 }]
                });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "550px"
        );

        addButtonBelow(
            wrapDiv,
            "Thought",
            () => {
                bubble.mergeWithNewBubbleProps({ style: "thought" });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "430px",
            "200px"
        );

        addButtonBelow(
            wrapDiv,
            "Caption",
            () => {
                bubble.mergeWithNewBubbleProps({ style: "caption" });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "460px",
            "200px"
        );

        addButtonBelow(
            wrapDiv,
            "Caption w/line",
            () => {
                bubble.mergeWithNewBubbleProps({
                    style: "caption",
                    tails: [{ tipX: 220, tipY: 250, midpointX: 220, midpointY: 175 }]
                });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "490px",
            "200px"
        );

        // This now adds a background color, but I haven't put a way in the test to remove the color.
        // Refreshing the Storybook webpage is a workaround for now.
        addButtonBelow(
            wrapDiv,
            "None w/bkg color",
            () => {
                bubble.mergeWithNewBubbleProps({
                    style: "none",
                    backgroundColors: ["#fedcba"]
                });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "520px",
            "200px"
        );

        addButtonBelow(
            wrapDiv,
            "Rectangle",
            () => {
                bubble.mergeWithNewBubbleProps({
                    style: "rectangle"
                });
                Comical.update(wrapDiv);
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            },
            "550px",
            "200px"
        );

        const button = addFinishButton(wrapDiv);
        // Force it below the wrapDiv.
        button.style.position = "absolute";
        button.style.top = "400px";
        button.style.left = "0";
        button.addEventListener("click", () => {
            // give the other events attached to 'click' a chance to process first.
            setTimeout(() => {
                updateTransparencyDetector(wrapDiv, bubble, inEditMode());
            }, 500);
        });

        const inEditMode = () => {
            return button.innerText === "Finish";
        };

        // Add a "transparency detector" that should fill with aqua color if the svg is transparent.
        const detector = document.createElement("div");
        detector.id = "transparency-detector";
        detector.style.position = "absolute";
        detector.style.top = "400px"; // put below canvas
        detector.style.left = "75px";
        detector.style.width = "240px";
        detector.style.border = "1px solid teal";
        detector.style.borderRadius = "12px";
        detector.style.textAlign = "center";
        detector.textContent = "Blue if bubbleSpec is transparent";
        wrapDiv.appendChild(detector);
        return wrapDiv;
    })
    .add("tail fully inside bubble draws okay", () => {
        // We had a real book with this situation and it caused problems. See BL-9451.
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.height = "400px";
        wrapDiv.style.width = "400px";
        wrapDiv.className = "wrapperDiv"; // just for debugging

        const textDiv1 = document.createElement("div");
        textDiv1.innerText = "parent";
        textDiv1.style.width = "200px";
        textDiv1.style.height = "100px";
        textDiv1.style.textAlign = "center";
        textDiv1.style.position = "absolute";
        textDiv1.style.top = "100px";
        textDiv1.style.left = "100px";
        wrapDiv.appendChild(textDiv1);

        let bubble = new Bubble(textDiv1);
        bubble.setBubbleSpec({
            version: "1.0",
            style: "speech",
            tails: [{ tipX: 125, tipY: 125, midpointX: 125, midpointY: 125, autoCurve: true }],
            level: 1,
            order: 1
        });

        setTimeout(() => {
            Comical.startEditing([wrapDiv]);
        }, 200);
        return wrapDiv;
    })
    .add("Multiple tails", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.height = "300px";
        wrapDiv.style.width = "500px";

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
            Comical.startEditing([wrapDiv]);
        }, 200);

        const button = addFinishButton(wrapDiv);
        // Force it below the wrapDiv.
        button.style.position = "absolute";
        button.style.top = "400px";
        button.style.left = "0";

        return wrapDiv;
    })
    .add("bubbles on two pictures", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        const firstPicDiv = document.createElement("div");
        firstPicDiv.style.position = "relative";
        firstPicDiv.style.background = "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/400px";
        firstPicDiv.style.height = "400px";
        wrapDiv.appendChild(firstPicDiv);

        const secondPicDiv = document.createElement("div");
        secondPicDiv.style.position = "relative";
        secondPicDiv.style.background = "url('The Moon and The Cap_Page 051.jpg') no-repeat 0/400px";
        secondPicDiv.style.height = "400px";
        wrapDiv.appendChild(secondPicDiv);

        var div1 = makeTextBlock(firstPicDiv, "Sweet! Rad glasses!", 120, 100, 100);

        var div2 = makeTextBlock(firstPicDiv, "I got a blue hat. I love it! Better not lose it...", 300, 150, 200);
        div2.setAttribute("contenteditable", "true");

        var div3 = makeTextBlock(secondPicDiv, "My hat is stuck in the tree!", 50, 50, 200);
        div3.setAttribute("contenteditable", "true");

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
                level: 2
            });
            const bubble3 = new Bubble(div3);
            bubble3.setBubbleSpec({
                version: "1.0",
                style: "speech",
                tails: [Bubble.makeDefaultTail(div3)],
                level: 1
            });
            Comical.startEditing([firstPicDiv, secondPicDiv]);
        }, 200);

        const button = addFinishButton(wrapDiv, undefined, undefined, [firstPicDiv, secondPicDiv]);
        // I can't get the button to respond to clicks if it overlays the canvas, so force it below the wrapDiv.
        button.style.position = "absolute";
        button.style.top = "600px";
        button.style.left = "0";
        return wrapDiv;
    })
    .add("compare with real bubbles", () => {
        Comical.setUserInterfaceProperties({ tailHandleColor: "pink" });
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        const firstPicDiv = document.createElement("div");
        firstPicDiv.style.position = "relative";
        firstPicDiv.style.background = "url('HowDidItGoMyDaughter.png') no-repeat 0/150px";
        firstPicDiv.style.backgroundColor = "cyan";
        firstPicDiv.style.height = "250px";
        wrapDiv.appendChild(firstPicDiv);

        const secondPicDiv = document.createElement("div");
        secondPicDiv.style.position = "relative";
        secondPicDiv.style.background = "url('MotherNaomi.png') no-repeat 0/150px";
        secondPicDiv.style.backgroundColor = "pink";
        secondPicDiv.style.height = "300px";
        wrapDiv.appendChild(secondPicDiv);

        var div1 = makeTextBlock(firstPicDiv, "How did it go, my daughter?", 180, 100, 80);

        var div3 = makeTextBlock(secondPicDiv, "Mother Naomi, we want to be with you!", 180, 100, 100);
        div3.setAttribute("contenteditable", "true");

        // MakeDefaultTip() needs to see the divs laid out in their eventual positions,
        // as does convertBubbleJsonToCanvas.
        window.setTimeout(() => {
            const bubble1 = new Bubble(div1);
            var tail = Bubble.makeDefaultTail(div1);
            bubble1.setBubbleSpec({
                version: "1.0",
                style: "speech",
                tails: [tail],
                level: 1
            });

            const bubble3 = new Bubble(div3);
            bubble3.setBubbleSpec({
                version: "1.0",
                style: "speech",
                tails: [Bubble.makeDefaultTail(div3)],
                level: 1
            });
            Comical.startEditing([firstPicDiv, secondPicDiv]);
        }, 200);

        const button = addFinishButton(wrapDiv, undefined, undefined, [firstPicDiv, secondPicDiv]);
        // I can't get the button to respond to clicks if it overlays the canvas, so force it below the wrapDiv.
        button.style.position = "absolute";
        button.style.top = "600px";
        button.style.left = "0";
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

            Comical.startEditing([wrapDiv]);
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
        paper.setup(canvas);

        const start = new paper.Point(100, 100);
        const tip = start.add(new paper.Point(200, 150));
        const layer1 = paper.project!.activeLayer;
        const layer2 = new paper.Layer();
        const handleLayer = new paper.Layer();
        paper.project!.addLayer(layer2);
        paper.project!.addLayer(handleLayer);
        const mid = Bubble.defaultMid(start, tip, new paper.Size(0, 0));

        const tail = new LineTail(
            start,
            tip,
            layer1,
            layer2,
            handleLayer,
            {
                tipX: tip.x,
                tipY: tip.y,
                midpointX: mid.x,
                midpointY: mid.y
            },
            undefined
        );
        tail.debugMode = true;
        tail.makeShapes();
        tail.showHandles();
        return canvas;
    });

storiesOf("comical/captions", module)
    .add("three captions on picture", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.background = "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
        wrapDiv.style.height = "600px";

        var div1 = makeTextBlock(wrapDiv, "Joe got some fancy glasses", 120, 100, 100);

        var div2 = makeTextBlock(wrapDiv, "Bill got a blue hat that he really loves", 300, 150, 200);
        div2.setAttribute("contenteditable", "true");

        var div3 = makeTextBlock(wrapDiv, "This is someone outside speaking.", 100, 250, 150);
        div3.setAttribute("contenteditable", "true");

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

            const bubble3 = new Bubble(div3);
            bubble3.setBubbleSpec({
                version: "1.0",
                style: "pointedArcs",
                tails: [],
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
    .add("single-pixel tail on picture", () => {
        const wrapDiv = document.createElement("div");

        wrapDiv.style.position = "relative";
        wrapDiv.style.background = "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
        wrapDiv.style.height = "600px";

        const canvas = document.createElement("canvas");
        canvas.width = wrapDiv.clientWidth;
        canvas.height = wrapDiv.clientHeight;
        paper.setup(canvas);

        wrapDiv.appendChild(canvas);

        var div1 = makeTextBlock(wrapDiv, "How do you like my fancy glasses?", 120, 100, 100);
        var div2 = makeTextBlock(wrapDiv, "Nice lollipop!", 200, 460, 150);

        window.setTimeout(() => {
            const bubble1 = new Bubble(div1);
            var tail1 = Bubble.makeDefaultTail(div1);
            tail1.style = "line";
            bubble1.setBubbleSpec({
                version: "1.0",
                style: "caption",
                tails: [tail1],
                level: 1,
                backgroundColors: ["rgb(255,255,255)", "rgb(150,150,150)"],
                shadowOffset: 1
            });
            const bubble2 = new Bubble(div2);
            var tail2 = Bubble.makeDefaultTail(div2);
            tail2.style = "line";
            bubble2.setBubbleSpec({
                version: "1.0",
                style: "none",
                tails: [tail2],
                level: 1,
                backgroundColors: ["rgba(255,192,203,0.3)"]
            });
            Comical.convertBubbleJsonToCanvas(wrapDiv);
            startDragging(wrapDiv);
        }, 200);
        addFinishButton(wrapDiv, 400, 600);

        return wrapDiv;
    })
    .add("Change background color on caption w/tail", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.height = "300px";
        wrapDiv.style.width = "500px";

        const textDiv2 = makeTextBlock(
            wrapDiv,
            "Change the bubble background color and make sure the tail doesn't disappear",
            120,
            50,
            250
        );
        wrapDiv.appendChild(textDiv2);

        let bubble = new Bubble(textDiv2);
        bubble.setBubbleSpec({
            version: "1.0",
            style: "caption",
            tails: [{ tipX: 220, tipY: 250, midpointX: 220, midpointY: 175 }],
            backgroundColors: ["#fff", "#839496"],
            level: 1,
            shadowOffset: 5
        });

        setTimeout(() => {
            Comical.startEditing([wrapDiv]);
        }, 200);

        addButtonBelow(
            wrapDiv,
            "Bloom Blue background",
            () => {
                bubble.mergeWithNewBubbleProps({ backgroundColors: ["#1d94a4"] });
                Comical.update(wrapDiv);
            },
            "430px"
        );

        const button = addFinishButton(wrapDiv);
        // Force it below the wrapDiv.
        button.style.position = "absolute";
        button.style.top = "400px";
        button.style.left = "0";

        return wrapDiv;
    })
    .add("Rounded corner caption", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.height = "300px";
        wrapDiv.style.width = "500px";

        const textDiv = makeTextBlock(
            wrapDiv,
            "Check that this caption has rounded corners, not square corners",
            120,
            50,
            250
        );

        const bubble = new Bubble(textDiv);
        bubble.setBubbleSpec({
            version: "1.0",
            style: "caption",
            cornerRadiusX: 5,
            cornerRadiusY: 5,
            tails: [],
            level: 1,
            shadowOffset: 5
        });

        setTimeout(() => {
            Comical.startEditing([wrapDiv]);
        }, 1);

        return wrapDiv;
    });

storiesOf("comical/parent child relations", module)
    .add("child bubbles", () => {
        // A generic picture
        // Four bubbles in the same layer, two overlapping
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.background = "url('The Moon and The Cap_Page 031.jpg') no-repeat 0/600px";
        wrapDiv.style.height = "600px";

        var div1 = makeTextBlock(wrapDiv, "Top left, last in chain", 30, 40, 100);
        var div2 = makeTextBlock(wrapDiv, "Top right, third in chain, a bit bigger", 280, 50, 150);

        var div3 = makeTextBlock(wrapDiv, "Lower right, overlaps top right", 250, 100, 100);
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
                backgroundColors: ["rgba(200,255,255,0.5)"]
            });
            // To get the right behaviour from initializeChild,
            // convertCanvasToSvgImg must have been called with
            // all the previous bubbles in the family defined.
            // So we turn it off and on again between each call.
            Comical.startEditing([wrapDiv]);
            Comical.initializeChild(div3, div4);
            Comical.stopEditing();
            Comical.startEditing([wrapDiv]);
            Comical.initializeChild(div2, div3);
            Comical.stopEditing();
            Comical.startEditing([wrapDiv]);
            Comical.initializeChild(div1, div4);
            Comical.stopEditing();
            Comical.startEditing([wrapDiv]);
            startDragging(wrapDiv);
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
    .add("child bubbles overlap with parent", () => {
        // Four bubbles in the same layer, two overlapping
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.height = "440px";

        const textDiv2 = document.createElement("div");
        textDiv2.innerHTML =
            "<table><tr><th>Action</th><th>Expectation</th></tr>" +
            "<tr><td>Activate the child.</td><td>Child tails and child tail handles should NOT be visible.</td></tr>" +
            "<tr><td>Activate the parent.</td><td>Parent's tail handles should be visible</td></tr></table>";
        textDiv2.style.width = "600px";
        textDiv2.style.textAlign = "left";
        textDiv2.style.position = "absolute";
        textDiv2.style.top = "10px";
        textDiv2.style.left = "10px";
        wrapDiv.appendChild(textDiv2);

        const childDivs: HTMLElement[] = [];
        const parentDivs: HTMLElement[] = [];

        childDivs.push(makeTextBlock(wrapDiv, "Child", 40, 120, 100, 40)); // Child is PROBABLY loaded before parent
        parentDivs.push(makeTextBlock(wrapDiv, "Parent", 80, 160, 100, 40));

        // Child is a strict subset of parent. (Thus, there is strictly speaking no intersection points of their outlines)
        // TODO: FIX ME. This case demonstrates a bug. (Tail handles shouldn't appear)
        parentDivs.push(makeTextBlock(wrapDiv, "Parent 2", 250, 130, 100, 80));
        childDivs.push(makeTextBlock(wrapDiv, "Child 2", 260, 160, 80));

        parentDivs.push(makeTextBlock(wrapDiv, "Parent 3", 385, 160, 100, 40)); // Parent is PROBABLY loaded before child. Tests opposite scenario as Case #1
        const childWithTailToSide = makeTextBlock(wrapDiv, "Child 3", 380, 120, 100, 40);
        childDivs.push(childWithTailToSide);

        // MakeDefaultTail() needs to see the divs laid out in their eventual positions,
        // as does convertBubbleJsonToCanvas.
        window.setTimeout(() => {
            for (let i = 0; i < parentDivs.length; ++i) {
                const parentDiv = parentDivs[i];
                const childDiv = childDivs[i];

                const parentBubble = new Bubble(parentDiv);
                parentBubble.setBubbleSpec({
                    version: "1.0",
                    style: "speech",
                    tails: [Bubble.makeDefaultTail(parentDiv)],
                    level: i + 1
                });

                Comical.startEditing([wrapDiv]);
                Comical.initializeChild(childDiv, parentDiv);

                if (childDiv == childWithTailToSide) {
                    const misguidedChildTailSpec: TailSpec = Bubble.makeDefaultTail(childDiv);
                    misguidedChildTailSpec.midpointX = 520;
                    misguidedChildTailSpec.midpointY = 160;
                    misguidedChildTailSpec.tipX = 385 + 100 / 2;
                    misguidedChildTailSpec.tipY = 160 + 40 / 2;
                    misguidedChildTailSpec.joiner = true;

                    const misguidedChildBubble = new Bubble(childDiv);
                    misguidedChildBubble.setBubbleSpec({
                        version: "1.0",
                        style: "speech",
                        tails: [misguidedChildTailSpec],
                        level: i + 1,
                        order: misguidedChildBubble.getBubbleSpec().order,
                        outerBorderColor: misguidedChildBubble.getBubbleSpec().outerBorderColor
                    });
                }

                if (i < parentDivs.length - 1) {
                    // To get the right behaviour from initializeChild,
                    // convertCanvasToSvgImg must have been called with
                    // all the previous bubbles in the family defined.
                    // So we turn it off and on again between each call.
                    Comical.stopEditing();
                }
            }
            Comical.update(wrapDiv);
            Comical.activateElement(childDivs[0]);
        }, 200);

        const buttonDiv = document.createElement("div");
        buttonDiv.style.position = "absolute";
        buttonDiv.style.left = "10px";
        buttonDiv.style.top = "250px";
        wrapDiv.appendChild(buttonDiv);

        for (let i = 0; i < parentDivs.length; ++i) {
            addButton(buttonDiv, `Click to activate child ${i + 1}`, () => {
                Comical.activateElement(childDivs[i]);
            });
            addButton(buttonDiv, `Click to activate parent ${i + 1}`, () => {
                Comical.activateElement(parentDivs[i]);
            });
        }

        addFinishButton(wrapDiv, 400, 450);
        return wrapDiv;
    })
    .add("child bubbles no overlap with parent", () => {
        // Two bubbles in the same layer, not overlapping
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.height = "440px";

        const textDiv2 = document.createElement("div");
        textDiv2.innerHTML =
            "<table><tr><th>Action</th><th>Expectation</th></tr>" +
            "<tr><td>Activate the child.</td><td>Tail handles should be visible.</td></tr>" +
            "<tr><td>Activate the parent.</td><td>Parent's tail handles should be visible.</td></tr>" +
            "<tr><td>Move the tail</td><td>No old tail should be left behind. (There should only be one tail.)</td></tr></table>";
        textDiv2.style.width = "600px";
        textDiv2.style.textAlign = "left";
        textDiv2.style.position = "absolute";
        textDiv2.style.top = "10px";
        textDiv2.style.left = "10px";
        wrapDiv.appendChild(textDiv2);

        const childDiv = makeTextBlock(wrapDiv, "Child", 40, 120, 100, 40);
        const parentDiv = makeTextBlock(wrapDiv, "Parent", 80, 200, 100, 40);

        // MakeDefaultTail() needs to see the divs laid out in their eventual positions,
        // as does convertBubbleJsonToCanvas.
        window.setTimeout(() => {
            // the parent div
            const parentBubble = new Bubble(parentDiv);
            parentBubble.setBubbleSpec({
                version: "1.0",
                style: "speech",
                tails: [Bubble.makeDefaultTail(parentDiv)],
                level: 1
            });
            // To get the right behaviour from initializeChild,
            // convertCanvasToSvgImg must have been called with
            // all the previous bubbles in the family defined.
            // So we turn it off and on again between each call.
            Comical.startEditing([wrapDiv]);
            Comical.stopEditing();
            Comical.startEditing([wrapDiv]);
            Comical.initializeChild(childDiv, parentDiv);
            Comical.stopEditing();
            Comical.startEditing([wrapDiv]);
            Comical.update(wrapDiv);
            Comical.activateElement(childDiv);
        }, 200);

        const buttonDiv = document.createElement("div");
        buttonDiv.style.position = "absolute";
        buttonDiv.style.left = "10px";
        buttonDiv.style.top = "275px";
        wrapDiv.appendChild(buttonDiv);

        addButton(buttonDiv, "Click to activate child", () => {
            Comical.activateElement(childDiv);
        });

        addButton(buttonDiv, "Click to activate parent", () => {
            Comical.activateElement(parentDiv);
        });

        addFinishButton(wrapDiv, 0, 450);
        return wrapDiv;
    })
    .add("child bubbles overlap - dynamic test", () => {
        // A generic picture
        // Four bubbles in the same layer, two overlapping
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.height = "440px";

        const textDiv2 = document.createElement("div");
        textDiv2.innerHTML =
            "<table><tr><th>Action</th><th>Expectation</th></tr>" +
            "<tr><td>Activate the child.</td><td>Child tails and child tail handles should NOT be visible.</td></tr>" +
            "<tr><td>Activate the parent.</td><td>Parent's tail handles should be visible</td></tr></table>";
        textDiv2.style.width = "600px";
        textDiv2.style.textAlign = "left";
        textDiv2.style.position = "absolute";
        textDiv2.style.top = "10px";
        textDiv2.style.left = "10px";
        wrapDiv.appendChild(textDiv2);

        const parentLeft = 85;
        const parentTop = 160;
        const parentWidth = 100;
        const parentHeight = 40;
        // Add child first to make this test harder
        const childDiv = makeTextBlock(
            wrapDiv,
            "Child",
            parentLeft - 5,
            parentTop - parentHeight,
            parentWidth,
            parentHeight
        );
        const parentDiv = makeTextBlock(wrapDiv, "Parent", parentLeft, parentTop, parentWidth, parentHeight);

        // MakeDefaultTail() needs to see the divs laid out in their eventual positions,
        // as does convertBubbleJsonToCanvas.
        window.setTimeout(() => {
            const parentBubble = new Bubble(parentDiv);
            parentBubble.setBubbleSpec({
                version: "1.0",
                style: "speech",
                tails: [Bubble.makeDefaultTail(parentDiv)],
                level: 1
            });

            Comical.startEditing([wrapDiv]);
            Comical.initializeChild(childDiv, parentDiv);

            if (childDiv == childDiv) {
                const misguidedChildTailSpec: TailSpec = Bubble.makeDefaultTail(childDiv);
                misguidedChildTailSpec.midpointX = parentWidth - 55;
                misguidedChildTailSpec.midpointY = parentTop - 25;
                misguidedChildTailSpec.tipX = parentLeft + parentWidth / 2;
                misguidedChildTailSpec.tipY = parentTop + parentHeight / 2;
                misguidedChildTailSpec.joiner = true;

                const misguidedChildBubble = new Bubble(childDiv);
                misguidedChildBubble.setBubbleSpec({
                    version: "1.0",
                    style: "speech",
                    tails: [misguidedChildTailSpec],
                    level: 1,
                    order: misguidedChildBubble.getBubbleSpec().order,
                    outerBorderColor: misguidedChildBubble.getBubbleSpec().outerBorderColor
                });
            }

            Comical.update(wrapDiv);
            Comical.activateElement(childDiv);
        }, 200);

        const buttonDiv = document.createElement("div");
        buttonDiv.style.position = "absolute";
        buttonDiv.style.left = "10px";
        buttonDiv.style.top = "250px";
        wrapDiv.appendChild(buttonDiv);

        let stepNumber = 1;
        addButton(buttonDiv, `Step ${stepNumber++}: Activate child - Nothing should change`, () => {
            Comical.activateElement(childDiv);
        });
        addButton(buttonDiv, `Step ${stepNumber++}: Activate parent - Parent handles should become visible.`, () => {
            Comical.activateElement(parentDiv);
        });
        addButton(
            buttonDiv,
            `Step ${stepNumber++}: Move child - Child tail should become visible, but no handle`,
            () => {
                childDiv.style.left = "250px";
            }
        );
        addButton(buttonDiv, `Step ${stepNumber++}: Activate child - Child mid handle visible now too`, () => {
            Comical.activateElement(childDiv);
        });
        addButton(buttonDiv, `Step ${stepNumber++}: Move parent on - child tail/handles should disappear`, () => {
            parentDiv.style.left = "250px";
        });
        addButton(buttonDiv, `Step ${stepNumber++}: Move parent off - child tail AND HANDLES should re-appear`, () => {
            parentDiv.style.left = "125px";
        });

        addFinishButton(wrapDiv, 400, 450);
        return wrapDiv;
    })
    .add("delete parent bubble - tail adjusts and background inherits", () => {
        const wrapDiv = document.createElement("div");
        wrapDiv.style.position = "relative";
        wrapDiv.style.height = "440px";

        const textDiv2 = document.createElement("div");
        textDiv2.innerHTML =
            "<table><tr><th>Action</th><th>Expectation</th></tr>" +
            "<tr><td>Delete the parent.</td><td>Child tail becomes non-joiner (pointed).</td></tr></table>";
        textDiv2.style.width = "600px";
        textDiv2.style.textAlign = "left";
        textDiv2.style.position = "absolute";
        textDiv2.style.top = "10px";
        textDiv2.style.left = "10px";
        wrapDiv.appendChild(textDiv2);

        const childDiv = makeTextBlock(wrapDiv, "Child", 40, 120, 100, 40);
        const parentDiv = makeTextBlock(wrapDiv, "Parent", 80, 200, 100, 40);

        // MakeDefaultTail() needs to see the divs laid out in their eventual positions,
        // as does convertBubbleJsonToCanvas.
        window.setTimeout(() => {
            // the parent div
            const parentBubble = new Bubble(parentDiv);
            parentBubble.setBubbleSpec({
                version: "1.0",
                style: "speech",
                tails: [Bubble.makeDefaultTail(parentDiv)],
                backgroundColors: ["rgba(200,255,255,0.5)"],
                level: 1
            });
            // To get the right behaviour from initializeChild,
            // convertCanvasToSvgImg must have been called with
            // all the previous bubbles in the family defined.
            // So we turn it off and on again between each call.
            Comical.startEditing([wrapDiv]);
            Comical.stopEditing();
            Comical.startEditing([wrapDiv]);
            Comical.initializeChild(childDiv, parentDiv);
            Comical.stopEditing();
            Comical.startEditing([wrapDiv]);
            Comical.update(wrapDiv);
            Comical.activateElement(parentDiv);
        }, 200);

        const buttonDiv = document.createElement("div");
        buttonDiv.style.position = "absolute";
        buttonDiv.style.left = "10px";
        buttonDiv.style.top = "275px";
        wrapDiv.appendChild(buttonDiv);

        addButton(buttonDiv, "Click to delete parent", () => {
            Comical.deleteBubbleFromFamily(parentDiv, wrapDiv);
        });

        addFinishButton(wrapDiv, 0, 450);
        return wrapDiv;
    });

storiesOf("comical/tails", module).add("midpoint rules", () => {
    const mainDiv = document.createElement("div");

    const wrapDiv = document.createElement("div");
    wrapDiv.style.position = "relative";
    wrapDiv.style.height = "500px";
    wrapDiv.style.width = "600px";
    wrapDiv.style.backgroundColor = "LightCyan";
    mainDiv.appendChild(wrapDiv);

    const textDivForBubble = document.createElement("div");
    textDivForBubble.innerText =
        "You should never be able to drag the midpoint into a bubble, including self... Unless you specifically allow for it with a special selector.";
    textDivForBubble.style.width = "200px";
    textDivForBubble.style.textAlign = "center";
    textDivForBubble.style.position = "absolute";
    textDivForBubble.style.top = "50px";
    textDivForBubble.style.left = "30px";
    textDivForBubble.style.pointerEvents = "none";
    wrapDiv.appendChild(textDivForBubble);

    let bubble = new Bubble(textDivForBubble);
    bubble.setBubbleSpec({
        version: "1.0",
        style: "speech",
        tails: [{ tipX: 100, tipY: 250, midpointX: 50, midpointY: 175 }],
        level: 1
    });

    const textDivForCaption = document.createElement("div");
    textDivForCaption.innerText = "not allowed";
    textDivForCaption.style.width = "200px";
    textDivForCaption.style.textAlign = "center";
    textDivForCaption.style.position = "absolute";
    textDivForCaption.style.top = "50px";
    textDivForCaption.style.left = "270px";
    textDivForCaption.style.pointerEvents = "none";
    textDivForCaption.classList.add("my-caption");
    wrapDiv.appendChild(textDivForCaption);

    let caption = new Bubble(textDivForCaption);
    caption.setBubbleSpec({
        version: "1.0",
        style: "caption",
        tails: [],
        level: 1
    });

    const divForRedBox = document.createElement("div");
    divForRedBox.innerText = "not allowed";
    divForRedBox.style.width = "200px";
    divForRedBox.style.height = "200px";
    divForRedBox.style.position = "absolute";
    divForRedBox.style.top = "150px";
    divForRedBox.style.left = "240px";
    divForRedBox.style.backgroundColor = "red";
    divForRedBox.style.pointerEvents = "none";
    divForRedBox.classList.add("my-red-box");
    wrapDiv.appendChild(divForRedBox);

    let redBubble = new Bubble(divForRedBox);
    redBubble.setBubbleSpec({
        version: "1.0",
        style: "none",
        tails: [],
        level: 1
    });

    setTimeout(() => {
        Comical.startEditing([wrapDiv]);
    }, 200);

    let redBoxAllowed = false;
    let captionAllowed = false;
    function getSelector() {
        var selectors: string[] = [];
        if (captionAllowed) selectors.push(".my-caption");
        if (redBoxAllowed) selectors.push(".my-red-box");
        return selectors.join(", ");
    }

    const toggleCaptionButton = addButton(wrapDiv, "Toggle allow dragging midpoint into caption", () => {
        captionAllowed = !captionAllowed;
        Comical.setSelectorForBubblesWhichTailMidpointMayOverlap(getSelector());
        textDivForCaption.innerText = captionAllowed ? "allowed" : "not allowed";
    });
    const toggleRedBoxButton = addButton(wrapDiv, "Toggle allow dragging midpoint into red box", () => {
        redBoxAllowed = !redBoxAllowed;
        Comical.setSelectorForBubblesWhichTailMidpointMayOverlap(getSelector());
        divForRedBox.innerText = redBoxAllowed ? "allowed" : "not allowed";
    });
    const buttonsDiv = document.createElement("div");
    buttonsDiv.appendChild(addFinishButton(wrapDiv));
    buttonsDiv.appendChild(toggleCaptionButton);
    buttonsDiv.appendChild(toggleRedBoxButton);
    mainDiv.appendChild(buttonsDiv);

    return mainDiv;
});

function makeTextBlock(
    parent: HTMLElement,
    content: string,
    x: number,
    y: number,
    width: number,
    height?: number
): HTMLElement {
    const textDiv = document.createElement("div");
    textDiv.innerText = content;
    textDiv.style.width = `${width}px`;
    if (height) {
        textDiv.style.height = `${height}px`;
    }
    textDiv.style.textAlign = "center";
    textDiv.style.position = "absolute";
    textDiv.style.top = `${y}px`;
    textDiv.style.left = `${x}px`;
    textDiv.style.zIndex = "1";
    parent.appendChild(textDiv);
    return textDiv;
}

function addFinishButton(wrapDiv: HTMLElement, left?: number, top?: number, roots?: HTMLElement[]): HTMLButtonElement {
    const button = document.createElement("button");
    button.title = "Finish";
    button.innerText = "Finish";
    button.style.zIndex = "100";
    if (left || top) {
        button.style.position = "absolute";
        if (left) {
            button.style.left = `${left}px`;
        }
        if (top) {
            button.style.top = `${top}px`;
        }
    }
    wrapDiv.appendChild(button);
    let editable = true;
    button.addEventListener("click", () => {
        if (editable) {
            if (roots) {
                Comical.stopEditing();
            } else {
                Comical.convertCanvasToSvgImg(wrapDiv);
            }
            editable = false;
            button.innerText = "Edit";
            button.title = "Edit";
        } else {
            if (roots) {
                Comical.startEditing(roots);
            } else {
                Comical.convertBubbleJsonToCanvas(wrapDiv);
            }
            editable = true;
            button.innerText = "Finish";
            button.title = "Finish";
        }
    });
    return button;
}

function addButton(wrapDiv: HTMLElement, buttonText: string, clickHandler: () => void): HTMLButtonElement {
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

function addButtonBelow(
    wrapDiv: HTMLElement,
    buttonText: string,
    clickHandler: () => void,
    position: string,
    left?: string
) {
    var result = addButton(wrapDiv, buttonText, clickHandler);
    result.style.position = "absolute";
    result.style.top = position;
    result.style.left = left ? left : "0";
}

function updateTransparencyDetector(wrapDiv: HTMLElement, bubble: Bubble, inEditMode: boolean) {
    const detector = document.getElementById("transparency-detector");
    let isTransparent = false;
    if (inEditMode) {
        detector!.innerText = "Blue if bubbleSpec is transparent";
        detector!.style.width = "240px";
        isTransparent = bubble.isTransparent();
    } else {
        detector!.innerText = "Blue if no SVG";
        detector!.style.width = "125px";
        isTransparent = wrapDiv.querySelector("svg.comical-generated") === null;
    }
    detector!.style.backgroundColor = isTransparent ? "aqua" : "";
}
