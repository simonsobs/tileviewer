/**
 * Derived largely from the prototype's selectionRegionControl.ts code
 * (https://github.com/simonsobs/tilerfrontend/blob/main/src/selectionRegionControl.ts)
 * 
 * Of note:
 * 1. Some logic has been added to set the selectionBounds at the top-level, allowing other
 *    child or map components access to them
 * 2. Download/reset buttons are rendered in an overlay that show/hide wrt to mousing over/off
 *    the drawn rectangle
 * 3. I added the "definite assignment assertion" (!) operator to resolve lots of TS errors related to
 *    the message "Property <prop_name> has no initializer and is not definitely assigned in the constructor"
 */
import { createControlComponent } from "@react-leaflet/core";
import L from "leaflet";
import './styles/area-selection.css';
import { getControlPaneOffsets } from "../utils/paneUtils";

interface SelectionRegionOptions extends L.ControlOptions {
  position: L.ControlPosition;
  handleSelectionBounds: (bounds: L.LatLngBounds | undefined) => void;
}

interface MapWithSelectionHandler extends L.Map {
  selection: SelectionRegionHandler
}

class SelectionRegionControl extends L.Control {
  options: SelectionRegionOptions;

  base_element!: HTMLDivElement;
  overlay_pane!: HTMLDivElement;
  map!: L.Map;

  /* Buttons */
  start_button!: HTMLButtonElement;
  passive_buttons!: HTMLButtonElement[];

  constructor(options: SelectionRegionOptions) {
    super(options);
    this.options = options;
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

  private createPassiveButtons(container: HTMLDivElement) {
    /* First create all the 'passive' buttons, those that will appear once 
     * we've selected the region and provide region-dependent functionality. */
    const download_fits = this.createButton(container, "Download FITS");
    download_fits.addEventListener("click", () => {
      /* TODO: Connect these to API endpoints */
      console.log("Download FITS");
    });

    const download_png = this.createButton(container, "Download PNG");
    download_png.addEventListener("click", () => {
      /* TODO: Connect these to API endpoints */
      console.log("Download PNG");
    });

    const remove_button = this.createButton(container, "Remove Region");

    this.passive_buttons = [download_fits, download_png, remove_button];

    remove_button.addEventListener("click", () => {
      (this.map as MapWithSelectionHandler).selection.reset();
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
    const {
      top,
      left,
      width,
      height,
    } = getControlPaneOffsets(this.map, bounds);
    this.overlay_pane.style.top = top as string;
    this.overlay_pane.style.left = left as string;
    this.overlay_pane.style.width = width as string;
    this.overlay_pane.style.height = height as string;
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
    this.overlay_pane = map.createPane("region-controls-overlay") as HTMLDivElement;
    this.overlay_pane.style.zIndex = String(650);
    this.createPassiveButtons(this.overlay_pane);
    this.overlay_pane.addEventListener('mouseover', () => {
      this.passive_buttons.forEach(b => this.showElement(b, 'flex'));
    })
    this.overlay_pane.addEventListener('mouseout', () => {
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
    this.start_button.addEventListener("click", () => {
      /* The selection will be disabled by the handler once complete. */
      (this.map as MapWithSelectionHandler).selection.enable();
      this.start_button.disabled = true;
      this.map.getContainer().style.cursor = "crosshair";
    });

    /* Add callback to event handler */
    (this.map as MapWithSelectionHandler).selection.registerCallback(
      (bounds: L.LatLngBounds) => {
        this.mutateStateAfterDrawing(bounds);
        this.options.handleSelectionBounds(bounds);
    });

    return this.base_element;
  }
}

class SelectionRegionHandler extends L.Handler {
  private drawing: boolean = false;

  start_point?: L.LatLng;
  end_point?: L.LatLng;
  rectangle?: L.Rectangle;
  vertices?: {
    ne?: L.CircleMarker,
    nw?: L.CircleMarker,
    se?: L.CircleMarker,
    sw?: L.CircleMarker,
  };
  callback!: Function;

  private map: L.Map;
  private container: HTMLElement;

  constructor(map: L.Map) {
    super(map);

    /* Register map components in the object */
    this.map = map;
    this.container = map.getContainer();
  }

  addHooks() {
    L.DomEvent.on(this.container, "mousedown", this.onMouseDown as L.DomEvent.EventHandlerFn, this);
  }

  removeHooks() {
    L.DomEvent.off(this.container, "mousedown", this.onMouseDown as L.DomEvent.EventHandlerFn, this);
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
    L.DomEvent.on(this.container, "mousemove", this.onMouseMove as L.DomEvent.EventHandlerFn, this);
    L.DomEvent.on(this.container, "mouseup", this.onMouseUp as L.DomEvent.EventHandlerFn, this);
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.drawing) {
      console.log(
        "This should never happen. Event handler for mouse move should never be called when not drawing"
      );
    } else {
      const bounds = new L.LatLngBounds(
        this.start_point!,
        this.map.containerPointToLatLng(new L.Point(event.x, event.y))
      )
      this.updateRectangleBounds(bounds);

      if (this.vertices) {
        this.updateVertexPositions(bounds);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    this.drawing = false;

    /* event.latlng seems to be undefined for some reason, so we need to convert manually. */
    this.end_point = this.map.containerPointToLatLng(new L.Point(event.x, event.y));

    L.DomEvent.off(this.container, "mousemove", this.onMouseMove as L.DomEvent.EventHandlerFn, this);
    L.DomEvent.off(this.container, "mouseup", this.onMouseUp as L.DomEvent.EventHandlerFn, this);

    /* Resume messing with my map, dude! */
    this.map.dragging.enable();
    L.DomUtil.enableTextSelection();
    this.map.getContainer().style.cursor = "";

    /* Remove myself. My job is done here. */
    (this.map as MapWithSelectionHandler).selection.disable();

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
    } else {
      this.rectangle.setBounds(bounds);
    }
  }

  private updateVertexPositions(bounds: L.LatLngBounds) {
    this.vertices?.ne?.setLatLng(bounds.getNorthEast());
    this.vertices?.nw?.setLatLng(bounds.getNorthWest());
    this.vertices?.se?.setLatLng(bounds.getSouthEast());
    this.vertices?.sw?.setLatLng(bounds.getSouthWest());
  }

  /* Register the callback with the handler. This will be called once the user has finished drawing. */
  registerCallback(callback: Function) {
    this.callback = () => callback(this.rectangle!.getBounds());
  }

  private createVertex(latlng: L.LatLng, options?: Omit<L.CircleOptions, 'radius'>) {
    return new L.CircleMarker(
        latlng,
        {
          ...options,
          color: 'black',
          fillOpacity: 1,
          radius: 3,
        }
      );
  }

  private handleResize(event: L.LeafletMouseEvent) {
    if (!this.rectangle) return;
    (this.map as MapWithSelectionHandler).selection.enable();

    /* Stop messing with my map, dude! */
    this.map.dragging.disable();
    L.DomUtil.disableTextSelection();
    this.drawing = true;

    const clickedLatLngString = event.latlng.toString();
    const rectangleBounds = this.rectangle.getBounds();
    const ne = rectangleBounds.getNorthEast();
    const se = rectangleBounds.getSouthEast();
    const nw = rectangleBounds.getNorthWest();
    const sw = rectangleBounds.getSouthWest();

    // determine which corner is clicked; we want to set opposite corner as start_point
    if (ne.toString() === clickedLatLngString) {
      this.start_point = sw;
    } else if (se.toString() === clickedLatLngString) {
      this.start_point = nw;
    } else if (nw.toString() === clickedLatLngString) {
      this.start_point = se;
    } else {
      this.start_point = ne;
    }

    /* Add drag and stop event listeners */
    L.DomEvent.on(this.container, "mousemove", this.onMouseMove as L.DomEvent.EventHandlerFn, this);
    L.DomEvent.on(this.container, "mouseup", this.onMouseUp as L.DomEvent.EventHandlerFn, this);
  }

  private finaliseRectangle() {
    const bounds = new L.LatLngBounds(this.start_point!, this.end_point!);
    /* Make sure we are exactly bounding start and stop */
    this.updateRectangleBounds(bounds);

    if (!this.vertices) {
      /* Create circles at vertices */
      this.vertices = {
        ne: this.createVertex(bounds.getNorthEast(), {className: 'vertex-ne'}),
        nw: this.createVertex(bounds.getNorthWest(), {className: 'vertex-nw'}),
        se: this.createVertex(bounds.getSouthEast(), {className: 'vertex-se'}),
        sw: this.createVertex(bounds.getSouthWest(), {className: 'vertex-sw'}),
      };
      Object.values(this.vertices).forEach(v => {
        v.addEventListener('mousedown', this.handleResize, this)
        v.addTo(this.map)
      })
    } else {
      this.updateVertexPositions(bounds);
    }

    /* Set the style of the rectangle to something different so they know they've finished. */
    this.rectangle!.setStyle({ color: "black", fill: false } as L.PathOptions);

    if (this.callback) {
      this.callback();
    }
  }
  
  reset() {
    if (this.rectangle) {
      this.rectangle.remove();
      this.rectangle = undefined;
    }

    if (this.vertices) {
      Object.values(this.vertices).forEach(v => v.remove());
      this.vertices = undefined;
    }

    this.drawing = false;
    this.start_point = undefined;
    this.end_point = undefined;
  }
}

export const AreaSelectionControl = createControlComponent(
    (props: SelectionRegionOptions) => new SelectionRegionControl(props),
  )

type Props = {
  handleSelectionBounds: (bounds: L.LatLngBounds | undefined) => void;
}

export function AreaSelection({handleSelectionBounds}: Props) {
  return <AreaSelectionControl position='topleft' handleSelectionBounds={handleSelectionBounds} />
}
