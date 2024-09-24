/**
 * Taken more-or-less directly from the prototype's selectionRegionControl.ts code
 * (https://github.com/simonsobs/tilerfrontend/blob/main/src/selectionRegionControl.ts)
 * 
 * Of note:
 * 1. Some logic has been added to set the selectionBounds at the top-level, allowing other
 *    child or map components access to them
 * 2. Typing is a pain for this, so I'm bypassing type checking for now.
 */

// @ts-nocheck
import { createControlComponent } from "@react-leaflet/core";
import * as L from "leaflet";
import './styles/area-selection.css';

interface SelectionRegionOptions extends L.ControlOptions {}

class SelectionRegionControl extends L.Control {
  options: SelectionRegionOptions;

  base_element: HTMLElement;
  map: L.Map;

  /* Buttons */
  start_button: HTMLButtonElement;
  remove_button: HTMLButtonElement;
  passive_buttons: HTMLButtonElement[];

  constructor(options?: SelectionRegionOptions) {
    super(options);
  }

  private createButton(container: HTMLDivElement, buttonText: string) {
    const button = L.DomUtil.create('button', 'area-select-button', container);
    button.textContent = buttonText;
    return button;
  }

  private hideElement(el: HTMLElement) {
    el.style.display = 'none';
  }

  private showElement(el: HTMLElement, display?: string) {
    const finalDisplay = display ?? 'block';
    el.style.display = finalDisplay;
  }

  private createButtons() {
    /* First create all the 'passive' buttons, those that will appear once 
     * we've selected the region and provide region-dependent functionality. */
    const download_fits = this.createButton(this.base_element, "Download FITS");
    download_fits.addEventListener("click", (event) => {
      /* TODO: Connect these to API endpoints */
      console.log("Download FITS");
    });

    const download_png = this.createButton(this.base_element, "Download PNG");
    download_png.addEventListener("click", (event) => {
      /* TODO: Connect these to API endpoints */
      console.log("Download PNG");
    });

    this.passive_buttons = [download_fits, download_png];

    this.start_button = this.createButton(this.base_element, "Select Region");
    this.start_button.addEventListener("click", (event) => {
      /* The selection will be disabled by the handler once complete. */
      this.map.selection.enable();
      this.hideElement(this.start_button)
      this.map.getContainer().style.cursor = "crosshair";
    });

    this.remove_button = this.createButton(this.base_element, "Remove Region");
    this.remove_button.addEventListener("click", (event) => {
      this.map.selection.reset();

      this.hideElement(this.remove_button);
      this.passive_buttons.forEach((button) => {this.hideElement(button)});

      this.showElement(this.start_button, 'flex')

      this.options.handleSelectionBounds(undefined);
    });

    /* By default, hide the remove button and all passive buttons */
    this.hideElement(this.remove_button);
    this.passive_buttons.forEach((button) => {this.hideElement(button)});
  }

  /* Mutates the state of the buttons after drawing */
  mutateStateAfterDrawing() {
    this.showElement(this.remove_button, 'flex');
    this.passive_buttons.forEach((button) => {this.showElement(button, 'flex')});
  }

  onAdd(map: L.Map) {
    /* Map propagation and event addition */
    this.map = map;
    this.map.addHandler("selection", SelectionRegionHandler);

    /* First, create transparent overlay pane for the drawing handler */
    const overlay_pane = map.createPane("overlay");
    overlay_pane.style.zIndex = String(650);

    /* Create container for button controls */
    this.base_element = L.DomUtil.create(
      "div",
      "leaflet-control-selection-region"
  );

    /* Create initial elements */
    this.createButtons();

    /* Add callback to event handler */

    this.map.selection.registerCallback(
      (bounds) => {
        this.mutateStateAfterDrawing();
        this.options.handleSelectionBounds(bounds)
    });

    return this.base_element;
  }
}

class SelectionRegionHandler extends L.Handler {
  private drawing: boolean = false;

  start_point: L.LatLng;
  end_point: L.LatLng;
  rectangle: L.Rectangle;
  callback: Function;

  private map: L.Map;
  private container: HTMLElement;

  constructor(map: L.Map) {
    super(map);

    /* Register map components in the object */
    this.map = map;
    this.container = map.getContainer();
  }

  addHooks() {
    L.DomEvent.on(this.container, "mousedown", this.onMouseDown, this);
  }

  removeHooks() {
    L.DomEvent.off(this.container, "mousedown", this.onMouseDown, this);
  }

  private onMouseDown(event: MouseEvent) {
    /* Stop messing with my map, dude! */
    this.map.dragging.disable();
    L.DomUtil.disableTextSelection();
    this.drawing = true;

    /* event.latlng seems to be undefined for some reason, so we need to convert manually. */
    this.start_point = this.map.containerPointToLatLng(
      new L.Point(event.x, event.y)
    );

    /* Create the rectangle. We will update it as we move the mouse. */
    this.createRectangle(
      new L.LatLngBounds(this.start_point, this.start_point)
    );

    /* Add drag and stop event listeners */
    L.DomEvent.on(this.container, "mousemove", this.onMouseMove, this);
    L.DomEvent.on(this.container, "mouseup", this.onMouseUp, this);
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.drawing) {
      console.log(
        "This should never happen. Event handler for mouse move should never be called when not drawing"
      );
    } else {
      this.updateRectangleBounds(
        new L.LatLngBounds(
          this.start_point,
          this.map.containerPointToLatLng(new L.Point(event.x, event.y))
        )
      );
    }
  }

  private onMouseUp(event: MouseEvent) {
    this.drawing = false;

    /* event.latlng seems to be undefined for some reason, so we need to convert manually. */
    this.end_point = this.map.containerPointToLatLng(new L.Point(event.x, event.y));

    L.DomEvent.off(this.container, "mousemove", this.onMouseMove, this);
    L.DomEvent.off(this.container, "mouseup", this.onMouseUp, this);

    /* Resume messing with my map, dude! */
    this.map.dragging.enable();
    L.DomUtil.enableTextSelection();
    this.map.getContainer().style.cursor = "";

    /* Remove myself. My job is done here. */
    this.map.selection.disable();

    /* Finalise the style of the rectangle. */
    this.finaliseRectangle();
  }

  private createRectangle(bounds: L.LatLngBounds) {
    this.rectangle = new L.Rectangle(bounds);
    this.rectangle.addTo(this.map);
  }

  private updateRectangleBounds(bounds: L.LatLngBounds) {
    if (!this.rectangle) {
      console.log("Rectangle not created, and you are trying to update it");
    }
    this.rectangle.setBounds(bounds);
  }

  /* Register the callback with the handler. This will be called once the user has finished drawing. */
  registerCallback(callback: Function) {
    this.callback = () => callback(this.rectangle.getBounds());
  }

  private finaliseRectangle() {
    /* Make sure we are exactly bounding start and stop */
    this.updateRectangleBounds(
      new L.LatLngBounds(this.start_point, this.end_point)
    );

    /* Set the style of the rectangle to something different so they know they've finished. */
    this.rectangle.setStyle({ color: "black", fill: false } as L.PathOptions);

    if (this.callback) {
      this.callback();
    }
  }
  
  reset() {
    if (this.rectangle) {
      this.rectangle.remove();
      this.rectangle = undefined;
    }

    this.drawing = false;
    this.start_point = undefined;
    this.end_point = undefined;
  }
}

export const AreaSelectionControl = createControlComponent(
    (props) => new SelectionRegionControl({...props, position: 'topleft'}),
)

type Props = {
  handleSelectionBounds: (bounds: L.LatLngBounds) => void;
}

export function AreaSelection({handleSelectionBounds}: Props) {
  return <AreaSelectionControl handleSelectionBounds={handleSelectionBounds} />
}
