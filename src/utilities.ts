import { Layer } from "paper";

// a place for useful functions that don't seem to belong in any particular class.

// Surprisingly, activating a layer does NOT activate its project automatically,
// resulting in new objects that were expected to go into the just-activated
// layer actually going into the activeLayer of the active project.
// This function activates both the layer and its project, so new objects
// automatically go into this layer.
export function activateLayer(layer: Layer) {
  if (layer) {
    layer.project.activate();
    layer.activate();
  }
}
