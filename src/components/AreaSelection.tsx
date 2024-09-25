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

// creates some padding between the top-left corner of the drawn region and the overlay_pane
const CONTROLS_CONTAINER_BUFFER = 5;

interface SelectionRegionOptions extends L.ControlOptions {}

class SelectionRegionControl extends L.Control {
  options: SelectionRegionOptions;

  base_element: HTMLElement;
  overlay_pane: HTMLElement;
  map: L.Map;

  /* Buttons */
  start_button: HTMLButtonElement;
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

  private showElement(el: HTMLElement, displayOption?: string) {
    const display = displayOption ?? 'block';
    el.style.display = display;
  }

  private createPassiveButtons(container) {
    /* First create all the 'passive' buttons, those that will appear once 
     * we've selected the region and provide region-dependent functionality. */
    const download_fits = this.createButton(container, "Download FITS");
    download_fits.addEventListener("click", (event) => {
      /* TODO: Connect these to API endpoints */
      console.log("Download FITS");
    });

    const download_png = this.createButton(container, "Download PNG");
    download_png.addEventListener("click", (event) => {
      /* TODO: Connect these to API endpoints */
      console.log("Download PNG");
    });

    const remove_button = this.createButton(container, "Remove Region");

    this.passive_buttons = [download_fits, download_png, remove_button];

    remove_button.addEventListener("click", (event) => {
      this.map.selection.reset();
      this.start_button.disabled = false;
      this.options.handleSelectionBounds(undefined);
      this.hideElement(this.overlay_pane);
    });
  }

  /** 
   * Mutates the state of the overlay pane after a selected region is drawn.
   * More specifically, we:
   *  1.  Make the overlay pane visible
   *  2.  Calculate the position and size of the overlay pane wrt the bounds
   *      of the drawn region
  */ 
  mutateStateAfterDrawing(bounds: L.LatLngBounds) {
    this.showElement(this.overlay_pane);
    const topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());
    const bottomRight = this.map.latLngToLayerPoint(bounds.getSouthEast());
    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);
    this.overlay_pane.style.top = `${topLeft.y + CONTROLS_CONTAINER_BUFFER}px`;
    this.overlay_pane.style.left = `${topLeft.x + CONTROLS_CONTAINER_BUFFER}px`;
    this.overlay_pane.style.width = `${width}px`;
    this.overlay_pane.style.minWidth = 'fit-content';
    this.overlay_pane.style.height = `${height}px`;
  }

  onAdd(map: L.Map) {
    /* Map propagation and event addition */
    this.map = map;
    this.map.addHandler("selection", SelectionRegionHandler);

    /**
     * 1. Create transparent overlay pane for the selected region's "control" elements
     * 2. Create and attach the "control" elements to the overlay pane
     * 3. Add event listeners that show/hide the "control" elements when mousing on/off
     *    the overlay pane
     * 4. Begin with the overlay pane hidden
     */
    this.overlay_pane = map.createPane("region-controls-overlay");
    this.overlay_pane.style.zIndex = String(650);
    this.createPassiveButtons(this.overlay_pane);
    this.overlay_pane.addEventListener('mouseover', (e) => {
      this.passive_buttons.forEach(b => this.showElement(b, 'flex'));
    })
    this.overlay_pane.addEventListener('mouseout', (e) => {
      this.passive_buttons.forEach((b) => this.hideElement(b));
    })
    this.hideElement(this.overlay_pane);
    /** End of notes */

    /* Create container for "Select Region" control button */
    this.base_element = L.DomUtil.create(
      "div",
      "leaflet-control-selection-region"
  );

    /* Create start button and define its click event */
    this.start_button = this.createButton(this.base_element, 'Select Region');
    this.start_button.addEventListener("click", (event) => {
      /* The selection will be disabled by the handler once complete. */
      this.map.selection.enable();
      this.start_button.disabled = true;
      this.map.getContainer().style.cursor = "crosshair";
    });

    /* Add callback to event handler */
    this.map.selection.registerCallback(
      (bounds) => {
        this.mutateStateAfterDrawing(bounds);
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
