## Comical-JS

![Typed with TypeScript](https://flat.badgen.net/badge/icon/Typed?icon=typescript&label&labelColor=blue&color=555555)

Comical-JS is a JavaScript library for displaying and editing comic balloons (speech bubbles), captions, callouts, and related text that floats above one or more images. Lacking a better term, we call all of these things _bubbles_.

Comical-JS only provides ui elements (handles) to control bubble tails. In the future it may provide ui for controlling the location and bounds of the bubble. But ui for properties like bubble style (thought-bubble, whisper, etc.), background color, etc. will always be left to the client application.

Similarly, Comical-JS does not provide any features related to the text inside the bubble. Instead, the client application must create the element containing the text, and then tell Comical-JS to attach to it. This gives client applications freedom to do whatever they need to with text.

Comical-JS comes from the [Bloom](https://github.com/BloomBooks) project which is an HTML-based literacy material production app. So it is a bit unusual in that it is designed to work with HTML-based editors like Bloom which make changes to the DOM and then save that DOM. For example, when active, Comical draws all the bubbles above an image using the HTML canvas. But when deactivated, Comical-JS inserts an SVG into the DOM, so that you can display the page without having to fire up Comical. Since you might want to later edit the bubbles, it also stores the JSON that defines each bubble in an attribute named _data-comical_. Using this, it can recreate the interactive bubble as needed.

[Demo of use inside of Bloom](https://i.imgur.com/cOLB8iQ.gif)

![Example from Bloom](https://i.imgur.com/oO9SOfK.png)

## Project Status

Comical has the main pieces in place and is in use within Bloom. We are gradually adding new bubble types and ways to style bubbles.

## Using Comical-JS

To get started:

`yarn add comicaljs`

### To make bubbles appear

You need one or more parent elements, typically containing the picture to which you want to add bubbles, and one or more elements you want to wrap bubbles around, typically positioned relative to the parent. The child elements must have a data-bubble attribute giving an initial specification of the desired bubble (and possibly tails) for that element.

A simple way to do this is, for each desired child, call

`Bubble.setBubbleSpec(child, Bubble.getDefaultBubbleSpec(child, "speech));`

To turn on editing mode, call

`Comical.startEditing([parent]);`

A user can then interactively click on a bubble to make handles appear and drag them to move the tail. You can specify more than one parent if you wish. Performance may well suffer with a large number of parents; Comical is designed for a number of parent images that would reasonably fit on a page.

### When done editing

To put the document in a state where the bubbles can't be edited and Comical.js code is not needed to make them appear, call

`Comical.stopEditing();`

(Later, you can call startEditing() again to resume editing.)

### BubbleSpec

The content of the data-comical attribute is a slightly modified JSON representation of a BubbleSpec. You can convert between them using Bubble.getBubbleSpec(element) and Bubble.setBubbleSpec(element, spec).

While we are still defining things, the details of BubbleSpec and the related TailSpec classes can be found in the sources.

If you setBubbleSpec() while Comical editing is happening (a valid way of changing an element's properties), or if you add or delete children, you should call

`Comical.update(parent);`

on the appropriate parent element to make the visible bubbles conform. Note that this must be done after calling Comical.startEditing() with 'parent' in the list of parents, and before the corresponding stopEditing() call.

(This isn't necessary if you just move the element that the bubble is wrapped around; Comical will automatically adjust things, as long as editing is turned on.)

### Child bubbles

Two of the properties of bubbles are level and order. Bubbles at the same level are considered to be a family and should have different orders. They will merge their outlines if they overlap. Bubbles in a family are expected to share most other properties; the one with the lowest order is considered the parent, and its properties control all the others in the family. Typically the parent is the bubble which has a tail linked to something in the picture. If the other bubbles don't overlap, joiner tails will be drawn linking them in order.

## Developing

Do this once to get the dependencies
`yarn`

Do this to launch a browser window in which you can see various examples of ComicalJS running, or add your own
`yarn storybook`

Do this to create a 'dest' directory with the current version of the files that are npm-published as part of Comical.js
`yarn build`

## Acknowledgements

[paperjs](http://paperjs.org/)

[Storybook](https://storybook.js.org/)
