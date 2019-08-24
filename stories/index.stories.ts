//import { document, console } from 'global';
import { storiesOf } from '@storybook/html';
import {setup, Path, Point, Color} from "paper";
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