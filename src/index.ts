// This file exists to import everything else (and define the module exports).
// It is the root for building the bundle.

import { Comical } from "./comical";
import { Bubble } from "./bubble";
import {
    BubbleSpec as BubbleSpecType,
    BubbleSpecPattern as BubbleSpecPatternType,
    TailSpec as TailSpecType
} from "./bubbleSpec";

export { Comical, Bubble };
export type BubbleSpec = BubbleSpecType;
export type BubbleSpecPattern = BubbleSpecPatternType;
export type TailSpec = TailSpecType;
