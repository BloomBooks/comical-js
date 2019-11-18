import { Path, Point, Color, Layer, Item } from "paper";
import { Comical } from "./comical";
import { TailSpec } from "bubbleSpec";
import { Bubble } from "./bubble";
import { activateLayer } from "./utilities";
import { Handle } from "./handle";

// This is an abstract base class for tails. A concrete class must at least
// override makeShapes; if it has additional control points, it will probably
// override showHandles, adjustForChangedRoot(), and adjustForChangedTip().
// If it involves additional shapes not stored in pathStroke and pathFill,
// it should override fillPaths() and allPaths().
export class Tail {
    // the path representing the line around the tail
    pathstroke: Path;
    // the path representing the space within the tail
    pathFill: Path;

    public debugMode: boolean;

    lowerLayer: Layer;
    upperLayer: Layer;
    handleLayer: Layer;

    root: Point;
    tip: Point;
    spec: TailSpec;
    bubble: Bubble | undefined;
    clickAction: () => void;
    state: string; // various values used during handle drag

    public constructor(
        root: Point,
        tip: Point,
        lowerLayer: Layer,
        upperLayer: Layer,
        handleLayer: Layer,
        spec: TailSpec,
        bubble: Bubble | undefined
    ) {
        this.lowerLayer = lowerLayer;
        this.upperLayer = upperLayer;
        this.handleLayer = handleLayer;
        this.spec = spec;

        this.root = root;
        this.tip = tip;
        this.bubble = bubble;
    }

    getFillColor(): Color {
        if (this.debugMode) {
            return new Color("yellow");
        }
        if (this.bubble) {
            return this.bubble.getBackgroundColor();
        }
        return Comical.backColor;
    }

    // Make the shapes that implement the tail.
    // If there are existing shapes (typically representing an earlier tail position),
    // remove them after putting the new shapes in the same z-order and layer.
    public makeShapes() {
        throw new Error("Each subclass must implement makeShapes");
    }

    public fillPaths(): Path[] {
        if (this.pathFill) {
            return [this.pathFill];
        } else {
            return [];
        }
    }

    public allPaths(): Path[] {
        const result = this.fillPaths();
        if (this.pathstroke) {
            result.push(this.pathstroke);
        }
        return result;
    }

    public onClick(action: () => void): void {
        this.clickAction = action;
        this.fillPaths().forEach(p => {
            Comical.setItemOnClick(p, action);
        });
    }

    adjustForChangedRoot(delta: Point) {
        // a hook for subclasses to adjust anything AFTER the root has moved distance delta.
        // Called from inside adjustRoot, which takes care of calling makeShapes() and
        // persistSpecChanges() AFTER calling this.
    }

    adjustRoot(newRoot: Point): void {
        const delta = newRoot.subtract(this.root!);
        if (Math.abs(delta.x!) + Math.abs(delta.y!) < 0.0001) {
            // hasn't moved; very likely adjustSize triggered by an irrelevant change to object;
            // We MUST NOT trigger the mutation observer again, or we get an infinte loop that
            // freezes the whole page.
            return;
        }
        this.root = newRoot;
        this.adjustForChangedRoot(delta);
        this.makeShapes();
        this.persistSpecChanges();
    }

    adjustForChangedTip(delta: Point) {
        // a hook for subclasses to adjust anything AFTER the tip has moved distance delta.
        // Called from inside adjustTip, which takes care of calling makeShapes() and
        // persistSpecChanges() AFTER calling this.
    }

    adjustTip(newTip: Point): void {
        const delta = newTip.subtract(this.tip!);
        if (Math.abs(delta.x!) + Math.abs(delta.y!) < 0.0001) {
            // hasn't moved; very likely adjustSize triggered by an irrelevant change to object;
            // We MUST NOT trigger the mutation observer again, or we get an infinte loop that
            // freezes the whole page.
            return;
        }
        this.tip = newTip;
        this.adjustForChangedTip(delta);
        this.makeShapes();
        if (this.spec) {
            this.spec.tipX = this.tip.x!;
            this.spec.tipY = this.tip.y!;
        }
        this.persistSpecChanges();
    }

    // Erases the tail from the canvas
    remove() {
        this.allPaths().forEach(p => p.remove());
    }

    currentStartPoint(): Point {
        if (this.bubble) {
            return this.bubble.calculateTailStartPoint();
        }
        return this.root;
    }

    public showHandles() {
        this.showHandlesInternal();

        if (this.isBubbleOverlappingParent()) {
            this.setTailAndHandleVisibility(false);
        }
    }

    okToMoveHandleTo(p: Point): boolean {
        if (!this.bubble) {
            return true; // pathological, or maybe in testing...can't really test
        }
        return Comical.okToMoveTo(this.bubble.content, p);
    }

    protected showHandlesInternal() {
        // Setup event handlers
        this.state = "idle";
        activateLayer(this.handleLayer);

        this.handleLayer.visible = true;
        let tipHandle: Handle;

        if (!this.spec.joiner) {
            // usual case...we want a handle for the tip.
            const isHandleSolid = false;
            tipHandle = new Handle(this.handleLayer, this.tip, isHandleSolid);

            tipHandle.onDrag = (where: Point) => {
                if (!this.okToMoveHandleTo(where)) {
                    return; // refuse to drag tip to a point inside a bubble
                }
                // tipHandle can't be undefined at this point
                const delta = where.subtract(tipHandle!.getPosition()).divide(2);
                tipHandle!.setPosition(where);
                this.tip = where;
                this.adjustForChangedTip(delta);
                this.makeShapes();

                // Update this.spec.tips to reflect the new handle positions
                this.spec.tipX = this.tip.x!;
                this.spec.tipY = this.tip.y!;
                this.persistSpecChanges();
            };
        }
    }

    persistSpecChanges() {
        if (this.bubble) {
            this.bubble.persistBubbleSpecWithoutMonitoring();
        }
    }

    private isBubbleOverlappingParent(): boolean {
        if (this.bubble) {
            // Assumes that the parent is already drawn, which is probably reasonable because showHandles() doesn't happen until activateElement() is called, which isn't right away.
            const parentBubble = Comical.findParent(this.bubble);
            if (parentBubble) {
                if (this.bubble.isOverlapping(parentBubble)) {
                    return true;
                }
            }
        }

        return false;
    }

    public setTailAndHandleVisibility(newVisibility: boolean): void {
        this.allPaths().forEach(p => (p.visible = newVisibility));

        // ENHANCE: It'd be nice to hide the tipHandle too, but that doesn't make a difference yet.
    }

    // We basically want non-solid bubbles transparent, especially for the tip, so
    // you can see where the tip actually ends up. But if it's perfectly transparent,
    // paper.js doesn't register hit tests on the transparent part. So go for a very
    // small alpha.
    static makeTransparentClickable(item: Item) {
        if (!item.fillColor) {
            item.fillColor = new Color("#1d94a4");
        }
        item.fillColor.alpha = 0.01;
    }
}
