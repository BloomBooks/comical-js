import { document, console } from 'global';
import { storiesOf } from '@storybook/html';
import SVG from "svg.js";

storiesOf('Demo', module)
  .add('heading', () => '<h1>Hello World</h1>')
  .add('button', () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerText = 'Hello Button';
    button.addEventListener('click', e => console.log(e));
    return button;
  });
storiesOf('svg', module)
  .add('square', () => {
    const div = document.createElement("div");
    var draw = SVG(div).size(300,300);
    var rect = draw.rect(100, 100).attr({ fill: '#f06' });
    return div;
  })