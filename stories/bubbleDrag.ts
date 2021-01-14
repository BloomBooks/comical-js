import { Comical } from "../src/comical";

// rather crude support for dragging bubbles around. Sometimes a bubble gets caught
// when aiming for a handle that's up against it, and it doesn't yet handle scaling.
// But it's good enough to help us try out the effects of moving bubbles in StoryBook.
// Assumes bubbles are positioned by style attributes containing left: and top: in px.
export function startDragging(containerIn: HTMLElement) {
    const container = containerIn;
    let startDragX = 0;
    let startDragY = 0;
    let dragWhat: HTMLElement | undefined = undefined;
    document.addEventListener("mousedown", (ev: MouseEvent) => {
        startDragX = ev.clientX;
        startDragY = ev.clientY;
        const dragBubble = Comical.getBubbleHit(container, startDragX, startDragY);
        dragWhat = dragBubble ? dragBubble.content : undefined;
    });
    document.addEventListener("mousemove", (ev: MouseEvent) => {
        if (ev.buttons === 1 && dragWhat) {
            const deltaX = ev.clientX - startDragX;
            const deltaY = ev.clientY - startDragY;
            if (deltaX != 0) {
                dragWhat.style.left = parseInt(dragWhat.style.left, 10) + deltaX + "px";
            }
            if (deltaY != 0) {
                dragWhat.style.top = parseInt(dragWhat.style.top, 10) + deltaY + "px";
            }
            startDragX = ev.clientX;
            startDragY = ev.clientY;
        }
    });
}
