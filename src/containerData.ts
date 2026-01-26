import { Bubble } from "./bubble";
import { Tail } from "./tail";

// The data that is kept in Comical's editElements map
// regarding a particular parent element that might contain bubbles.
export class ContainerData {
    project: paper.Project; // The project corresponding to the canvas made to cover the parent
    bubbleList: Bubble[]; // Bubbles for child elements of the parent
    handleLayer?: paper.Layer; // The layer in which handles should be drawn for that parent
    // When true, tail adjustments should be deferred until all bubble outlines are ready
    batchInitializing?: boolean;
    // Tails that need their roots adjusted, along with the delta to apply
    pendingTailAdjustments?: Array<{ tail: Tail; delta: paper.Point }>;
}
