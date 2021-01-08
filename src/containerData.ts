import { Bubble } from "./bubble";

// The data that is kept in Comical's editElements map
// regarding a particular parent element that might contain bubbles.
export class ContainerData {
    project: paper.Project; // The project corresponding to the canvas made to cover the parent
    bubbleList: Bubble[]; // Bubbles for child elements of the parent
    handleLayer?: paper.Layer; // The layer in which handles should be drawn for that parent
}
