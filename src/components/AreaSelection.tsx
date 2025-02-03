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
import { useEffect, useRef, useState, useCallback, FormEvent } from "react";
import L from "leaflet";
import './styles/area-selection.css';
import { getControlPaneOffsets } from "../utils/paneUtils";
import { useMap } from "react-leaflet";
import { downloadSubmap, addSubmapAsBox } from "../utils/fetchUtils";
import { crop } from "../icons/crop";
import { menu } from "../icons/menu";
import { SERVICE_URL } from "../configs/mapSettings";
import { Dialog } from "./Dialog";

/** Literal type of possible submap file extensions */
export type SubmapFileExtensions = 'fits' | 'jpg' | 'png' | 'webp';

type SubmapDownloadOption = {
    display: string;
    ext: SubmapFileExtensions
}

export type SubmapEndpointData = {
  mapId: number;
  bandId: number;
  left: number;
  top: number;
  bottom: number;
  right: number;
}

/** An array of download options used to create the buttons and the click events that download submaps */
const SUBMAP_DOWNLOAD_OPTIONS: SubmapDownloadOption[] = [
    { display: 'FITS', ext: 'fits' },
    { display: 'PNG', ext: 'png' },
    { display: 'JPG', ext: 'jpg' },
    { display: 'WebP', ext: 'webp' },
  ];

interface SelectionRegionOptions extends L.ControlOptions {
  position: L.ControlPosition;
  handleSelectionBounds: (bounds: L.LatLngBounds | undefined) => void;
  submapEndpointData?: SubmapEndpointData;
  setShowAddBoxDialog: (showBox: boolean) => void;
}

interface MapWithSelectionHandler extends L.Map {
  selection: SelectionRegionHandler
}

class SelectionRegionControl extends L.Control {
  options: SelectionRegionOptions;

  baseElement!: HTMLDivElement;
  overlayPane!: HTMLDivElement;
  map!: L.Map;

  /** The button rendered in the top-left of the map that, when clicked, allows the user to draw their selection region */
  startButton!: HTMLButtonElement;
  /** The hamburger menu button that, when clicked, shows the buttons to download, add or remove the region */
  hamburgerMenuButton!: HTMLButtonElement;
  /** The list of buttons containing actionable items, like download, add or remove region, that toggle on/off 
    according to click events on the hamburger menu */
  menuOptionButtons!: HTMLButtonElement[];

  constructor(options: SelectionRegionOptions) {
    super(options);
    this.options = options;
  }

  refreshMenuButtons(setShowAddBoxDialog: SelectionRegionOptions['setShowAddBoxDialog'], newSubmapEndpointData?: SubmapEndpointData) {
    this.options.submapEndpointData = newSubmapEndpointData;

    // Remove all existing elements from this.overlayPane
    while (this.overlayPane.firstChild) {
      this.overlayPane.removeChild(this.overlayPane.firstChild)
    }

    /** Create a div to the overlayPane and hide it initially */
    const menuDiv = L.DomUtil.create('div', undefined, this.overlayPane);
    this.hideElement(menuDiv);

    /** Create a div for the hamburger menu to pass into createHamburgerMenuButton
      as the parent container */
    const hamburgerMenuDiv = L.DomUtil.create('div', undefined, menuDiv);
    this.createHamburgerMenuButton(hamburgerMenuDiv);
    
    /** Create a div for the menu options buttons to pass into createMenuOptionButtons
      as the parent container, and set it to be hidden initially */
    const menuOptionsButtonsDiv = L.DomUtil.create('div', 'menu-btns-container', menuDiv);
    this.hideElement(menuOptionsButtonsDiv);
    // Pass the new endpoint stub to be used by the download buttons
    this.createMenuOptionButtons(menuOptionsButtonsDiv, setShowAddBoxDialog, newSubmapEndpointData);

    // Add click event to show/hide the container with the menu options buttons and
    // adjust the style of the hamburger menu accordingly
    this.hamburgerMenuButton.addEventListener('click', () => {
      if (menuOptionsButtonsDiv.style.display == 'none') {
        this.showElement(menuOptionsButtonsDiv, 'flex')
        this.hamburgerMenuButton.classList.add('menu-button-active')
      } else {
        this.hideElement(menuOptionsButtonsDiv)
        this.hamburgerMenuButton.classList.remove('menu-button-active')
      }
    })
  }

  /**
   * A method to create and append new buttons to the DOM
   * @param container The HTML container to append the button element to
   * @param className A className to provide to DomUtil.create
   * @param buttonText Optional button text
   * @param buttonContent Optional button content that can be passed into innerHTML
   *  for more elaborate button design
   * @returns The new button
   */
  private createButton(
    container: HTMLDivElement,
    className: string = '',
    buttonText: string | undefined,
    buttonContent: string | undefined
  ) {
    const finalButtonContent = buttonContent ? buttonContent : buttonText ? buttonText : ''
    const button = L.DomUtil.create('button', className, container);
    button.innerHTML = finalButtonContent
    return button;
  }

  private hideElement(el: HTMLElement) {
    el.style.display = 'none';
  }

  private showElement(el: HTMLElement, displayOption?: string) {
    const display = displayOption ?? 'block';
    el.style.display = display;
  }

  private createHamburgerMenuButton(container: HTMLDivElement) {
    this.hamburgerMenuButton = this.createButton(container, 'menu-button', undefined, menu);
  }

  /**
   * Creates the buttons used as the "expanded" menu, like the buttons to download the submap
   * @param container The HTML container to append the buttons to
   * @param submapEndpointStub The endpoint stub used in the click events associated with the download buttons
   */
  private createMenuOptionButtons(container: HTMLDivElement, setShowAddBoxDialog: SelectionRegionOptions['setShowAddBoxDialog'], submapEndpointData?: SubmapEndpointData) {
    // Set to an empty array when invoked
    this.menuOptionButtons = [];

    // Create each "download" button and create a click event that will trigger the appropriate download
    // according to its display, extension, and endpoint stub
    SUBMAP_DOWNLOAD_OPTIONS.forEach(option => {
      const btn = this.createButton(container, 'area-select-button', `Download ${option.display}`, undefined);
      btn.addEventListener(
        'click',
        () => {
          if (submapEndpointData) {
            downloadSubmap(submapEndpointData, option.ext)
          }
        }
      )
      // Push each button onto the menuOptionButtons array
      this.menuOptionButtons.push(btn)
    })

    const addBoxBtn = this.createButton(container, 'area-select-button', 'Add as Box', undefined);
    addBoxBtn.addEventListener(
      'click',
      () => setShowAddBoxDialog(true)
    )
    this.menuOptionButtons.push(addBoxBtn)

    /** Create a button that removes the selection region */
    const remove_button = this.createButton(container, 'area-select-button', "Remove Region", undefined);
    remove_button.addEventListener("click", () => {
      (this.map as MapWithSelectionHandler).selection.reset();
      this.startButton.disabled = false;
      this.options.handleSelectionBounds(undefined);
      this.hideElement(this.overlayPane);
    });

    // Push the remove button onto the menu_options_buttons array too
    this.menuOptionButtons.push(remove_button);
  }

  /** 
   * Mutates the state of the overlay pane after a selected region is drawn.
   * More specifically, we:
   *  1.  Make the overlay pane visible
   *  2.  Calculate the position and size of the overlay pane wrt the bounds
   *      of the drawn region
  */ 
  mutateStateAfterDrawing(bounds: L.LatLngBounds) {
    this.showElement(this.overlayPane);
    const {
      top,
      left,
      width,
      height,
    } = getControlPaneOffsets(this.map, bounds);
    this.overlayPane.style.top = top as string;
    this.overlayPane.style.left = left as string;
    this.overlayPane.style.width = width as string;
    this.overlayPane.style.height = height as string;
  }

  onAdd(map: L.Map) {
    /* Map propagation and event addition */
    this.map = map;
    this.map.addHandler("selection", SelectionRegionHandler);

    /* Create transparent overlay pane with a high z-index for the selected region's "control" elements,
      and begin with the overlay pane hidden */
    this.overlayPane = map.createPane("region-controls-overlay") as HTMLDivElement;
    this.overlayPane.style.zIndex = String(650);
    this.hideElement(this.overlayPane);

    // Add event listeners to show/hide the pane's outermost div, which should be the
    // menu container
    this.overlayPane.addEventListener('mouseover', () => {
      if (
        this.overlayPane.firstChild && 
        this.overlayPane.firstChild instanceof HTMLDivElement
      ) {
        this.showElement(this.overlayPane.firstChild, 'flex');
      }
    })
    this.overlayPane.addEventListener('mouseout', () => {
      if (
        this.overlayPane.firstChild && 
        this.overlayPane.firstChild instanceof HTMLDivElement
      ) {
        this.hideElement(this.overlayPane.firstChild);
      }
    })

    /* Create container for "Select Region" control button */
    this.baseElement = L.DomUtil.create(
      "div",
      "leaflet-control-selection-region"
  );

    /* Create start button and define its click event */
    this.startButton = this.createButton(
      this.baseElement,
      'start-button',
      undefined,
      crop,
    );
    this.startButton.setAttribute('title', 'Draw a region on the map');
    this.startButton.addEventListener("click", () => {
      /* The selection will be disabled by the handler once complete. */
      (this.map as MapWithSelectionHandler).selection.enable();
      this.startButton.disabled = true;
      this.map.getContainer().style.cursor = "crosshair";
    });

    /* Add callback to event handler */
    (this.map as MapWithSelectionHandler).selection.registerCallback(
      (bounds: L.LatLngBounds) => {
        this.mutateStateAfterDrawing(bounds);
        this.options.handleSelectionBounds(bounds);
    });

    return this.baseElement;
  }
}

class SelectionRegionHandler extends L.Handler {
  private drawing: boolean = false;

  startPoint?: L.LatLng;
  endPoint?: L.LatLng;
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
    this.startPoint = this.map.containerPointToLatLng(
      new L.Point(event.x, event.y)
    );

    /* Create the rectangle. We will update it as we move the mouse. */
    this.createRectangle(
      new L.LatLngBounds(this.startPoint, this.startPoint)
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
        this.startPoint!,
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
    this.endPoint = this.map.containerPointToLatLng(new L.Point(event.x, event.y));

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
    this.rectangle.setStyle({
      'dashArray': '4',
      'opacity': 0.7,
      'weight': 2
    })
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
          weight: 2,
          fillColor: 'white',
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

    // determine which corner is clicked; we want to set opposite corner as startPoint
    if (ne.toString() === clickedLatLngString) {
      this.startPoint = sw;
    } else if (se.toString() === clickedLatLngString) {
      this.startPoint = nw;
    } else if (nw.toString() === clickedLatLngString) {
      this.startPoint = se;
    } else {
      this.startPoint = ne;
    }

    /* Add drag and stop event listeners */
    L.DomEvent.on(this.container, "mousemove", this.onMouseMove as L.DomEvent.EventHandlerFn, this);
    L.DomEvent.on(this.container, "mouseup", this.onMouseUp as L.DomEvent.EventHandlerFn, this);
  }

  private finaliseRectangle() {
    const bounds = new L.LatLngBounds(this.startPoint!, this.endPoint!);
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
    this.startPoint = undefined;
    this.endPoint = undefined;
  }
}

export const AreaSelectionControl = ({
  position,
  handleSelectionBounds,
  submapEndpointData,
  setShowAddBoxDialog,
}: SelectionRegionOptions) => {
  /** Get a reference to the map so we can add the control to it */
  const map = useMap();
  
  /** We're creating a reference to the control element so that we can sync it with
    changes to the submapEndpointStub */
  const controlRef = useRef<SelectionRegionControl | null>(null);

  useEffect(() => {
    // Remove existing control before adding a new one
    if (controlRef.current) {
      map.removeControl(controlRef.current)
    }

    const control = new SelectionRegionControl({
      position,
      handleSelectionBounds,
      submapEndpointData,
      setShowAddBoxDialog,
    });
    control.addTo(map);
    controlRef.current = control;

    // Remove the control when component unmounts
    return () => {
      if (controlRef.current) {
        map.removeControl(controlRef.current);
      }
    }
  }, [map, handleSelectionBounds])

  useEffect(() => {
    // Invoke the SelectionRegionControl's refreshMenuButtons method
    // if/when the submapEndpointStub prop changes
    if (controlRef.current) {
      controlRef.current.refreshMenuButtons(setShowAddBoxDialog, submapEndpointData)
    }
  }, [map, submapEndpointData, setShowAddBoxDialog])

  return null
}

/**
  * handleSelectionBounds: The handler to set the selection bounds in SelectionRegionControl,
  *  which exists higher up the component order so we can recompute the selection region's
  *  position when the map is zoomed.
  * 
  * submapEndpointStub: A stubbed string of the endpoint used to download submaps, which exists
  *  higher up the component order because we need state at the map level to construct it
 */
type Props = {
  handleSelectionBounds: (bounds: L.LatLngBounds | undefined) => void;
  submapEndpointData?: SubmapEndpointData;
}

export function AreaSelection({
  handleSelectionBounds,
  submapEndpointData,
}: Props) {
  const [showAddBoxDialog, setShowAddBoxDialog] = useState(false)
  const [boxName, setBoxName] = useState('')
  const [boxDescription, setBoxDescription] = useState('')

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      // Return if we don't have any coords to send the server
      if (!submapEndpointData) return;

      const formData = new FormData(e.target as HTMLFormElement)
      const params = new URLSearchParams();

      formData.forEach(
        (val, key) => {
          params.append(key, val.toString());
        }
      )

      const endpoint = `${SERVICE_URL}/highlights/boxes/new?${params.toString()}`

      const {top, left, bottom, right} = submapEndpointData;
      const top_left = [left, top]
      const bottom_right = [right, bottom]

      addSubmapAsBox(
        endpoint,
        top_left,
        bottom_right,
      )

      setShowAddBoxDialog(false);

    }, [setShowAddBoxDialog, submapEndpointData]
  )

  return (
    <>
      <Dialog
        dialogKey='add-box-dialog'
        openDialog={showAddBoxDialog}
        setOpenDialog={setShowAddBoxDialog}
        headerText="Add New Box Layer"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
        >
          <label>
              Name
              <input
                name="name"
                type="text"
                value={boxName}
                onChange={(e) => setBoxName(e.target.value)}
                required
              />
          </label>
          <label>
              Description
              <textarea
                name="description"
                value={boxDescription}
                onChange={(e) => setBoxDescription(e.target.value)}
              />
          </label>
          <input type="submit" value="Add Box" />
        </form>
      </Dialog>
      <AreaSelectionControl
        // Sets the position of the "Select Region" control button to the top left of the map
        position='topleft'
        handleSelectionBounds={handleSelectionBounds}
        submapEndpointData={submapEndpointData}
        setShowAddBoxDialog={setShowAddBoxDialog}
      />
    </>
  )
}
