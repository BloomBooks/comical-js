## About Comical-JS

Comical-JS is a JavaScript library for displaying and editing comic balloons (speech bubbles), captions, callouts, and related text that floats above an image. Lacking a better term, we call all of these things *bubbles*. 

Comical-JS only provides ui elements (handles) to control bubble tails. In the future it may provide ui for controlling the location and bounds of the bubble. But ui for properties like bubble style (thought-bubble, whisper, etc.), background color, etc. will always be left to the client application.

Similarly, Comical-JS does not provide any features related to the text inside the bubble. Instead, the client application must create the element containing the text, and then tell Comical-JS to attach to it. This gives client applications freedom to do whatever they need to with text.

Comical-JS comes from the [Bloom]( https://github.com/BloomBooks) project which is an HTML-based literacy material production app. So it is a bit unusual in that it is designed to work with HTML-based editors like Bloom which make changes to the DOM and then save that DOM. For example, when active, Comical draws all the bubbles above an image using the HTML canvas. But when deactivated, Comical-JS inserts an SVG into the DOM, so the you can display the page without having to fire up Comical. Since you might want to later edit the bubbles, it also stores the JSON that defines each bubble in an attribute named *data-comical*. Using this, it can recreate the interactive bubble as needed.

## Project Status

We are just getting started, so not really ready for anyone to use or contribute to this library. We expect to have it in production by the end of 2019.  Progress and goals are available on the [Kanban board]( https://github.com/BloomBooks/comical-js/projects/1).

## Using Comical-JS

We do not have an NPM release yet.

While we are still defining things, the API will only be documented as storybook stories.

## Developing

`yarn`

`yarn storybook`

## Acknowledgements

[paperjs]( http://paperjs.org/)

[Storybook](https://storybook.js.org/)


