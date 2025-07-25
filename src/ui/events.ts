import {Event} from '../util/evented';
import * as DOM from '../util/dom';
import Point from '@mapbox/point-geometry';
import {extend} from '../util/util';

import type Tile from '../source/tile';
import type LngLat from '../geo/lng_lat';
import type BoxZoomHandler from './handler/box_zoom';
import type DragPanHandler from './handler/shim/drag_pan';
import type DragRotateHandler from './handler/shim/drag_rotate';
import type ScrollZoomHandler from './handler/scroll_zoom';
import type DoubleClickZoomHandler from './handler/shim/dblclick_zoom';
import type TouchZoomRotateHandler from './handler/shim/touch_zoom_rotate';
import type {Map} from './map';
import type {GeoJSONFeature} from '../util/vectortile_to_geojson';
import type {OverscaledTileID} from '../source/tile_id';
import type {EventData, EventOf} from '../util/evented';
import type {SourceSpecification} from '../style-spec/types';

export type MapMouseEventType =
    | 'mousedown'
    | 'mouseup'
    | 'preclick'
    | 'click'
    | 'dblclick'
    | 'mousemove'
    | 'mouseover'
    | 'mouseenter'
    | 'mouseleave'
    | 'mouseout'
    | 'contextmenu';

export type MapTouchEventType =
    | 'touchstart'
    | 'touchend'
    | 'touchcancel';

/**
 * `MapMouseEvent` is a class used by other classes to generate
 * mouse events of specific types such as 'click' or 'hover'.
 * For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
 *
 * @extends {Object}
 * @example
 * // Example of a MapMouseEvent of type "click"
 * map.on('click', (e) => {
 *     console.log(e);
 *     // {
 *     //     lngLat: {
 *     //         lng: 40.203,
 *     //         lat: -74.451
 *     //     },
 *     //     originalEvent: {...},
 *     //     point: {
 *     //         x: 266,
 *     //         y: 464
 *     //     },
 *     //      target: {...},
 *     //      type: "click"
 *     // }
 * });
 * @see [Reference: `Map` events API documentation](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-events)
 * @see [Example: Display popup on click](https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/)
 * @see [Example: Display popup on hover](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
 */
export class MapMouseEvent extends Event<MapEvents, MapMouseEventType> {
    /**
     * The type of originating event. For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
     */
    override type: MapMouseEventType;

    /**
     * The `Map` object that fired the event.
     */
    override target: Map;

    /**
     * The DOM event which caused the map event.
     */
    originalEvent: MouseEvent;

    /**
     * The pixel coordinates of the mouse cursor, relative to the map and measured from the top left corner.
     */
    point: Point;

    /**
     * The geographic location on the map of the mouse cursor.
     */
    lngLat: LngLat;

    /**
     * If a single `layerId`(as a single string) or multiple `layerIds` (as an array of strings) were specified when adding the event listener with {@link Map#on},
     * `features` will be an array of [GeoJSON](http://geojson.org/) [Feature objects](https://tools.ietf.org/html/rfc7946#section-3.2).
     * The array will contain all features from that layer that are rendered at the event's point,
     * in the order that they are rendered with the topmost feature being at the start of the array.
     * The `features` are identical to those returned by {@link Map#queryRenderedFeatures}.
     *
     * If no `layerId` was specified when adding the event listener, `features` will be `undefined`.
     * You can get the features at the point with `map.queryRenderedFeatures(e.point)`.
     *
     * @example
     * // logging features for a specific layer (with `e.features`)
     * map.on('click', 'myLayerId', (e) => {
     *     console.log(`There are ${e.features.length} features at point ${e.point}`);
     * });
     *
     * @example
     * // logging features for two layers (with `e.features`)
     * map.on('click', ['layer1', 'layer2'], (e) => {
     *     console.log(`There are ${e.features.length} features at point ${e.point}`);
     * });
     *
     * @example
     * // logging all features for all layers (without `e.features`)
     * map.on('click', (e) => {
     *     const features = map.queryRenderedFeatures(e.point);
     *     console.log(`There are ${features.length} features at point ${e.point}`);
     * });
     */
    features?: Array<GeoJSONFeature>;

    /**
     * Prevents subsequent default processing of the event by the map.
     *
     * Calling this method will prevent the following default map behaviors:
     *
     *   * On `mousedown` events, the behavior of {@link DragPanHandler}.
     *   * On `mousedown` events, the behavior of {@link DragRotateHandler}.
     *   * On `mousedown` events, the behavior of {@link BoxZoomHandler}.
     *   * On `dblclick` events, the behavior of {@link DoubleClickZoomHandler}.
     *
     * @example
     * map.on('click', (e) => {
     *     e.preventDefault();
     * });
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * `true` if `preventDefault` has been called.
     * @private
     */
    get defaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    /**
     * @private
     */
    _defaultPrevented: boolean;

    /**
     * @private
     */
    constructor(type: MapMouseEventType, map: Map, originalEvent: MouseEvent, data: EventData = {}) {
        const point = DOM.mousePos(map.getCanvasContainer(), originalEvent);
        const lngLat = map.unproject(point);
        super(type, extend({point, lngLat, originalEvent}, data) as MapEvents[MapMouseEventType]);
        this._defaultPrevented = false;
        this.target = map;
    }
}

/**
 * `MapTouchEvent` is a class used by other classes to generate
 * mouse events of specific types such as 'touchstart' or 'touchend'.
 * For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
 *
 * @extends {Object}
 *
 * @example
 * // Example of a MapTouchEvent of type "touch"
 * map.on('touchstart', (e) => {
 *     console.log(e);
 *     // {
 *     //   lngLat: {
 *     //      lng: 40.203,
 *     //      lat: -74.451
 *     //   },
 *     //   lngLats: [
 *     //      {
 *     //         lng: 40.203,
 *     //         lat: -74.451
 *     //      }
 *     //   ],
 *     //   originalEvent: {...},
 *     //   point: {
 *     //      x: 266,
 *     //      y: 464
 *     //   },
 *     //   points: [
 *     //      {
 *     //         x: 266,
 *     //         y: 464
 *     //      }
 *     //   ]
 *     //   preventDefault(),
 *     //   target: {...},
 *     //   type: "touchstart"
 *     // }
 * });
 * @see [Reference: `Map` events API documentation](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-events)
 * @see [Example: Create a draggable point](https://docs.mapbox.com/mapbox-gl-js/example/drag-a-point/)
 */
export class MapTouchEvent extends Event<MapEvents, MapTouchEventType> {
    /**
     * The type of originating event. For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
     */
    override type: MapTouchEventType;

    /**
     * The `Map` object that fired the event.
     */
    override target: Map;

    /**
     * The DOM event which caused the map event.
     */
    originalEvent: TouchEvent;

    /**
     * The geographic location on the map of the center of the touch event points.
     */
    lngLat: LngLat;

    /**
     * The pixel coordinates of the center of the touch event points, relative to the map and measured from the top left
     * corner.
     */
    point: Point;

    /**
     * The array of pixel coordinates corresponding to a
     * [touch event's `touches`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/touches) property.
     */
    points: Array<Point>;

    /**
     * The geographical locations on the map corresponding to a
     * [touch event's `touches`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/touches) property.
     */
    lngLats: Array<LngLat>;

    /**
     * If a `layerId` was specified when adding the event listener with {@link Map#on}, `features` will be an array of
     * [GeoJSON](http://geojson.org/) [Feature objects](https://tools.ietf.org/html/rfc7946#section-3.2).
     * The array will contain all features from that layer that are rendered at the event's point.
     * The `features` are identical to those returned by {@link Map#queryRenderedFeatures}.
     *
     * If no `layerId` was specified when adding the event listener, `features` will be `undefined`.
     * You can get the features at the point with `map.queryRenderedFeatures(e.point)`.
     *
     * @example
     * // logging features for a specific layer (with `e.features`)
     * map.on('touchstart', 'myLayerId', (e) => {
     *     console.log(`There are ${e.features.length} features at point ${e.point}`);
     * });
     *
     * @example
     * // logging all features for all layers (without `e.features`)
     * map.on('touchstart', (e) => {
     *     const features = map.queryRenderedFeatures(e.point);
     *     console.log(`There are ${features.length} features at point ${e.point}`);
     * });
     */
    features: Array<GeoJSONFeature> | undefined;

    /**
     * Prevents subsequent default processing of the event by the map.
     *
     * Calling this method will prevent the following default map behaviors:
     *
     *   * On `touchstart` events, the behavior of {@link DragPanHandler}.
     *   * On `touchstart` events, the behavior of {@link TouchZoomRotateHandler}.
     *
     * @example
     * map.on('touchstart', (e) => {
     *     e.preventDefault();
     * });
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * Returns `true` if `preventDefault` has been called.
     * @private
     */
    get defaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    _defaultPrevented: boolean;

    /**
     * @private
     */
    constructor(type: MapTouchEventType, map: Map, originalEvent: TouchEvent) {
        const touches = type === "touchend" ? originalEvent.changedTouches : originalEvent.touches;
        const points = DOM.touchPos(map.getCanvasContainer(), touches);
        const lngLats = points.map((t) => map.unproject(t));
        const point = points.reduce((prev, curr, i, arr) => {
            return prev.add(curr.div(arr.length));
        }, new Point(0, 0));
        const lngLat = map.unproject(point);
        super(type, {points, point, lngLats, lngLat, originalEvent} as MapEvents[MapTouchEventType]);
        this._defaultPrevented = false;
    }
}

export type MapWheelEventType = 'wheel';

/**
 * `MapWheelEvent` is a class used by other classes to generate
 * mouse events of specific types such as 'wheel'.
 * For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
 *
 * @extends {Object}
 * @example
 * // Example event trigger for a MapWheelEvent of type "wheel"
 * map.on('wheel', (e) => {
 *     console.log('event type:', e.type);
 *     // event type: wheel
 * });
 * @example
 * // Example of a MapWheelEvent of type "wheel"
 * // {
 * //   originalEvent: WheelEvent {...},
 * // 	 target: Map {...},
 * // 	 type: "wheel"
 * // }
 * @see [Reference: `Map` events API documentation](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-events)
 */
export class MapWheelEvent extends Event<MapEvents, MapWheelEventType> {
    /**
     * The type of originating event. For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
     */
    override type: MapWheelEventType;

    /**
     * The `Map` object that fired the event.
     */
    override target: Map;

    /**
     * The DOM event which caused the map event.
     */
    originalEvent: WheelEvent;

    /**
     * Prevents subsequent default processing of the event by the map.
     * Calling this method will prevent the the behavior of {@link ScrollZoomHandler}.
     *
     * @example
     * map.on('wheel', (e) => {
     *     // Prevent the default map scroll zoom behavior.
     *     e.preventDefault();
     * });
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * `true` if `preventDefault` has been called.
     * @private
     */
    get defaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    _defaultPrevented: boolean;

    /**
     * @private
     */
    constructor(map: Map, originalEvent: WheelEvent) {
        super('wheel', {originalEvent} as MapEvents[MapWheelEventType]);
        this._defaultPrevented = false;
    }
}

export type MapInteractionEventType = MapMouseEventType | MapTouchEventType | MapWheelEventType;

/**
 * `MapBoxZoomEvent` is a class used to generate
 * the events 'boxzoomstart', 'boxzoomend', and 'boxzoomcancel'.
 * For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
 *
 * @typedef {Object} MapBoxZoomEvent
 * @property {MouseEvent} originalEvent The DOM event that triggered the boxzoom event. Can be a `MouseEvent` or `KeyboardEvent`.
 * @property {('boxzoomstart' | 'boxzoomend' | 'boxzoomcancel')} type The type of originating event. For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
 * @property {Map} target The `Map` instance that triggered the event.
 * @example
 * // Example trigger of a BoxZoomEvent of type "boxzoomstart"
 * map.on('boxzoomstart', (e) => {
 *     console.log('event type:', e.type);
 *     // event type: boxzoomstart
 * });
 * @example
 * // Example of a BoxZoomEvent of type "boxzoomstart"
 * // {
 * //   originalEvent: {...},
 * //   type: "boxzoomstart",
 * //   target: {...}
 * // }
 * @see [Reference: `Map` events API documentation](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-events)
 * @see [Example: Highlight features within a bounding box](https://docs.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
 */
export type MapBoxZoomEvent = {
    type: 'boxzoomstart' | 'boxzoomend' | 'boxzoomcancel';
    target: Map;
    originalEvent: MouseEvent;
};

export type MapStyleDataEvent = {
    dataType: 'style';
};

export type MapSourceDataEvent = {
    dataType: 'source';
    isSourceLoaded?: boolean;
    source?: SourceSpecification;
    sourceId?: string;
    sourceCacheId?: string;
    sourceDataType?: 'metadata' | 'content' | 'visibility' | 'error';
    tile?: Tile;
    coord?: Tile['tileID'];
    resourceTiming?: PerformanceResourceTiming[]
};

/**
 * `MapDataEvent` is a type of events related to loading data, styles, and sources.
 * For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
 *
 * @typedef {Object} MapDataEvent
 * @property {('data' | 'dataloading' | 'styledata' | 'styledataloading' | 'sourcedata'| 'sourcedataloading')} type The type of originating event. For a full list of available events, see [`Map` events](/mapbox-gl-js/api/map/#map-events).
 * @property {('source' | 'style')} dataType The type of data that has changed. One of `'source'` or `'style'`, where `'source'` refers to the data associated with any source, and `'style'` refers to the entire [style](https://docs.mapbox.com/help/glossary/style/) used by the map.
 * @property {boolean} [isSourceLoaded] True if the event has a `dataType` of `source` and the source has no outstanding network requests.
 * @property {Object} [source] The [style spec representation of the source](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/) if the event has a `dataType` of `source`.
 * @property {string} [sourceId] The `id` of the [`source`](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/) that triggered the event, if the event has a `dataType` of `source`. Same as the `id` of the object in the `source` property.
 * @property {string} [sourceDataType] Included if the event has a `dataType` of `source` and the event signals
 * that internal data has been received or changed. Possible values are `metadata`, `content` and `visibility`, and `error`.
 * @property {Object} [tile] The tile being loaded or changed, if the event has a `dataType` of `source` and
 * the event is related to loading of a tile.
 * @property {OverscaledTileID} [coord] The coordinate of the tile if the event has a `dataType` of `source` and
 * the event is related to loading of a tile.
 * @example
 * // Example of a MapDataEvent of type "sourcedata"
 * map.on('sourcedata', (e) => {
 *     console.log(e);
 *     // {
 *     //   dataType: "source",
 *     //   isSourceLoaded: false,
 *     //   source: {
 *     //     type: "vector",
 *     //     url: "mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2"
 *     //   },
 *     //   sourceDataType: "visibility",
 *     //   sourceId: "composite",
 *     //   style: {...},
 *     //   target: {...},
 *     //   type: "sourcedata"
 *     // }
 * });
 * @see [Reference: `Map` events API documentation](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-events)
 * @see [Example: Change a map's style](https://docs.mapbox.com/mapbox-gl-js/example/setstyle/)
 * @see [Example: Add a GeoJSON line](https://docs.mapbox.com/mapbox-gl-js/example/geojson-line/)
 */
export type MapDataEvent = MapStyleDataEvent | MapSourceDataEvent;

export type MapContextEvent = MapEventOf<'webglcontextlost' | 'webglcontextrestored'>;

export type MapEvents = {
    /** @section Interaction */

    /**
     * Fired when a pointing device (usually a mouse) is pressed within the map.
     *
     * **Note:** This event is compatible with the optional `layerId` parameter.
     * If `layerId` is included as the second argument in {@link Map#on}, the event listener will fire only when the
     * the cursor is pressed while inside a visible portion of the specifed layer.
     *
     * @event mousedown
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener
     * map.on('mousedown', () => {
     *     console.log('A mousedown event has occurred.');
     * });
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener for a specific layer
     * map.on('mousedown', 'poi-label', () => {
     *     console.log('A mousedown event has occurred on a visible portion of the poi-label layer.');
     * });
     * @see [Example: Highlight features within a bounding box](https://docs.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     * @see [Example: Create a draggable point](https://docs.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    'mousedown': MapMouseEvent;

    /**
     * Fired when a pointing device (usually a mouse) is released within the map.
     *
     * **Note:** This event is compatible with the optional `layerId` parameter.
     * If `layerId` is included as the second argument in {@link Map#on}, the event listener will fire only when the
     * the cursor is released while inside a visible portion of the specifed layer.
     *
     * @event mouseup
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener
     * map.on('mouseup', () => {
     *     console.log('A mouseup event has occurred.');
     * });
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener for a specific layer
     * map.on('mouseup', 'poi-label', () => {
     *     console.log('A mouseup event has occurred on a visible portion of the poi-label layer.');
     * });
     * @see [Example: Highlight features within a bounding box](https://docs.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     * @see [Example: Create a draggable point](https://docs.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    'mouseup': MapMouseEvent;

    /**
     * Fired when a pointing device (usually a mouse) is moved within the map.
     * As you move the cursor across a web page containing a map,
     * the event will fire each time it enters the map or any child elements.
     *
     * **Note:** This event is compatible with the optional `layerId` parameter.
     * If `layerId` is included as the second argument in {@link Map#on}, the event listener will fire only when the
     * the cursor is moved inside a visible portion of the specifed layer.
     *
     * @event mouseover
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener
     * map.on('mouseover', () => {
     *     console.log('A mouseover event has occurred.');
     * });
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener for a specific layer
     * map.on('mouseover', 'poi-label', () => {
     *     console.log('A mouseover event has occurred on a visible portion of the poi-label layer.');
     * });
     * @see [Example: Get coordinates of the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
     * @see [Example: Highlight features under the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     * @see [Example: Display a popup on hover](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
     */
    'mouseover': MapMouseEvent;

    /**
     * Fired when a pointing device (usually a mouse) is moved while the cursor is inside the map.
     * As you move the cursor across the map, the event will fire every time the cursor changes position within the map.
     *
     * **Note:** This event is compatible with the optional `layerId` parameter.
     * If `layerId` is included as the second argument in {@link Map#on}, the event listener will fire only when the
     * the cursor is inside a visible portion of the specified layer.
     *
     * @event mousemove
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener
     * map.on('mousemove', () => {
     *     console.log('A mousemove event has occurred.');
     * });
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener for a specific layer
     * map.on('mousemove', 'poi-label', () => {
     *     console.log('A mousemove event has occurred on a visible portion of the poi-label layer.');
     * });
     * @see [Example: Get coordinates of the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
     * @see [Example: Highlight features under the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     * @see [Example: Display a popup on over](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
     */
    'mousemove': MapMouseEvent;

    /**
     * Triggered when a click event occurs and is fired before the click event.
     * Primarily implemented to ensure closeOnClick for pop-ups is fired before any other listeners.
     *
     * @event preclick
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     */
    'preclick': MapMouseEvent;

    /**
     * Fired when a pointing device (usually a mouse) is pressed and released at the same point on the map.
     *
     * **Note:** This event is compatible with the optional `layerId` parameter.
     * If `layerId` is included as the second argument in {@link Map#on}, the event listener will fire only when the
     * point that is pressed and released contains a visible portion of the specifed layer.
     *
     * @event click
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener
     * map.on('click', (e) => {
     *     console.log(`A click event has occurred at ${e.lngLat}`);
     * });
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener for a specific layer
     * map.on('click', 'poi-label', (e) => {
     *     console.log(`A click event has occurred on a visible portion of the poi-label layer at ${e.lngLat}`);
     * });
     * @see [Example: Measure distances](https://www.mapbox.com/mapbox-gl-js/example/measure/)
     * @see [Example: Center the map on a clicked symbol](https://www.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
     */
    'click': MapMouseEvent;

    /**
     * Fired when a pointing device (usually a mouse) is pressed and released twice at the same point on
     * the map in rapid succession.
     *
     * **Note:** This event is compatible with the optional `layerId` parameter.
     * If `layerId` is included as the second argument in {@link Map#on}, the event listener will fire only
     * when the point that is clicked twice contains a visible portion of the specifed layer.
     *
     * @event dblclick
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener
     * map.on('dblclick', (e) => {
     *     console.log(`A dblclick event has occurred at ${e.lngLat}`);
     * });
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener for a specific layer
     * map.on('dblclick', 'poi-label', (e) => {
     *     console.log(`A dblclick event has occurred on a visible portion of the poi-label layer at ${e.lngLat}`);
     * });
     */
    'dblclick': MapMouseEvent;

    /**
     * Fired when a pointing device (usually a mouse) enters a visible portion of a specified layer from
     * outside that layer or outside the map canvas.
     *
     * **Important:** This event can only be listened for when {@link Map#on} includes three arguments,
     * where the second argument specifies the desired layer.
     *
     * @event mouseenter
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener
     * map.on('mouseenter', 'water', () => {
     *     console.log('A mouseenter event occurred on a visible portion of the water layer.');
     * });
     * @see [Example: Center the map on a clicked symbol](https://docs.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
     * @see [Example: Display a popup on click](https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/)
     */
    'mouseenter': MapMouseEvent;

    /**
     * Fired when a pointing device (usually a mouse) leaves a visible portion of a specified layer or moves
     * from the specified layer to outside the map canvas.
     *
     * **Note:** To detect when the mouse leaves the canvas, independent of layer, use {@link Map.event:mouseout} instead.
     *
     * **Important:** This event can only be listened for when {@link Map#on} includes three arguments,
     * where the second argument specifies the desired layer.
     *
     * @event mouseleave
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the pointing device leaves
     * // a visible portion of the specified layer.
     * map.on('mouseleave', 'water', () => {
     *     console.log('A mouseleave event occurred.');
     * });
     * @see [Example: Highlight features under the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     * @see [Example: Display a popup on click](https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/)
     */
    'mouseleave': MapMouseEvent;

    /**
     * Fired when a point device (usually a mouse) leaves the map's canvas.
     *
     * @event mouseout
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the pointing device leaves
     * // the map's canvas.
     * map.on('mouseout', () => {
     *     console.log('A mouseout event occurred.');
     * });
     */
    'mouseout': MapMouseEvent;

    /**
     * Fired when the right button of the mouse is clicked or the context menu key is pressed within the map.
     *
     * @event contextmenu
     * @memberof Map
     * @instance
     * @type {MapMouseEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the right mouse button is
     * // pressed within the map.
     * map.on('contextmenu', () => {
     *     console.log('A contextmenu event occurred.');
     * });
     */
    'contextmenu': MapMouseEvent;

    /**
     * Fired when a [`wheel`](https://developer.mozilla.org/en-US/docs/Web/Events/wheel) event occurs within the map.
     *
     * @event wheel
     * @memberof Map
     * @instance
     * @type {MapWheelEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when a wheel event occurs within the map.
     * map.on('wheel', () => {
     *     console.log('A wheel event occurred.');
     * });
     */
    'wheel': MapWheelEvent;

    /**
     * Fired when a [`touchstart`](https://developer.mozilla.org/en-US/docs/Web/Events/touchstart) event occurs within the map.
     *
     * @event touchstart
     * @memberof Map
     * @instance
     * @type {MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when a `touchstart` event occurs within the map.
     * map.on('touchstart', () => {
     *     console.log('A touchstart event occurred.');
     * });
     * @see [Example: Create a draggable point](https://docs.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    'touchstart': MapTouchEvent;

    /**
     * Fired when a [`touchend`](https://developer.mozilla.org/en-US/docs/Web/Events/touchend) event occurs within the map.
     *
     * @event touchend
     * @memberof Map
     * @instance
     * @type {MapTouchEvent}
     * @example
     * // Initialize the map.
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires when a `touchstart` event occurs within the map.
     * map.on('touchstart', () => {
     *     console.log('A touchstart event occurred.');
     * });
     * @see [Example: Create a draggable point](https://docs.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    'touchend': MapTouchEvent;

    /**
     * Fired when a [`touchmove`](https://developer.mozilla.org/en-US/docs/Web/Events/touchmove) event occurs within the map.
     *
     * @event touchmove
     * @memberof Map
     * @instance
     * @type {MapTouchEvent}
     * @example
     * // Initialize the map.
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires when a touchmove event occurs within the map.
     * map.on('touchmove', () => {
     *     console.log('A touchmove event occurred.');
     * });
     * @see [Example: Create a draggable point](https://docs.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    'touchmove': MapTouchEvent;

    /**
     * Fired when a [`touchcancel`](https://developer.mozilla.org/en-US/docs/Web/Events/touchcancel) event occurs within the map.
     *
     * @event touchcancel
     * @memberof Map
     * @instance
     * @type {MapTouchEvent}
     * @example
     * // Initialize the map.
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires when a `touchcancel` event occurs within the map.
     * map.on('touchcancel', () => {
     *     console.log('A touchcancel event occurred.');
     * });
     */
    'touchcancel': MapTouchEvent;

    /** @section Movement */

    /**
     * Fired just before the map begins a transition from one view to another, as the result of either user interaction or methods such as {@link Map#jumpTo}.
     *
     * @event movestart
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map.
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires just before the map begins a transition from one view to another.
     * map.on('movestart', () => {
     *     console.log('A movestart` event occurred.');
     * });
     */
    'movestart': {originalEvent?: MouseEvent | WheelEvent | TouchEvent};

    /**
     * Fired repeatedly during an animated transition from one view to another, as the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event move
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map.
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires repeatedly during an animated transition.
     * map.on('move', () => {
     *     console.log('A move event occurred.');
     * });
     * @see [Example: Display HTML clusters with custom properties](https://docs.mapbox.com/mapbox-gl-js/example/cluster-html/)
     * @see [Example: Filter features within map view](https://docs.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
     */
    'move': {originalEvent?: MouseEvent | WheelEvent | TouchEvent};

    /**
     * Fired just after the map completes a transition from one
     * view to another, as the result of either user interaction or methods such as {@link Map#jumpTo}.
     *
     * @event moveend
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just after the map completes a transition.
     * map.on('moveend', () => {
     *     console.log('A moveend event occurred.');
     * });
     * @see [Example: Play map locations as a slideshow](https://www.mapbox.com/mapbox-gl-js/example/playback-locations/)
     * @see [Example: Filter features within map view](https://www.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
     * @see [Example: Display HTML clusters with custom properties](https://docs.mapbox.com/mapbox-gl-js/example/cluster-html/)
     */
    'moveend': {originalEvent?: MouseEvent | WheelEvent | TouchEvent};

    /**
     * Fired when a "drag to pan" interaction starts. See {@link DragPanHandler}.
     *
     * @event dragstart
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when a "drag to pan" interaction starts.
     * map.on('dragstart', () => {
     *     console.log('A dragstart event occurred.');
     * });
     */
    'dragstart': {originalEvent?: MouseEvent | TouchEvent};

    /**
     * Fired repeatedly during a "drag to pan" interaction. See {@link DragPanHandler}.
     *
     * @event drag
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // repeatedly during a "drag to pan" interaction.
     * map.on('drag', () => {
     *     console.log('A drag event occurred.');
     * });
     */
    'drag': {originalEvent?: MouseEvent | TouchEvent};

    /**
     * Fired when a "drag to pan" interaction ends. See {@link DragPanHandler}.
     *
     * @event dragend
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when a "drag to pan" interaction ends.
     * map.on('dragend', () => {
     *     console.log('A dragend event occurred.');
     * });
     * @see [Example: Create a draggable marker](https://docs.mapbox.com/mapbox-gl-js/example/drag-a-marker/)
     */
    'dragend': {originalEvent?: MouseEvent | TouchEvent};

    /**
     * Fired just before the map begins a transition from one zoom level to another,
     * as the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event zoomstart
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just before a zoom transition starts.
     * map.on('zoomstart', () => {
     *     console.log('A zoomstart event occurred.');
     * });
     */
    'zoomstart': {originalEvent?: WheelEvent | TouchEvent} | void;

    /**
     * Fired repeatedly during an animated transition from one zoom level to another,
     * as the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event zoom
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // repeatedly during a zoom transition.
     * map.on('zoom', () => {
     *     console.log('A zoom event occurred.');
     * });
     * @see [Example: Update a choropleth layer by zoom level](https://www.mapbox.com/mapbox-gl-js/example/updating-choropleth/)
     */
    'zoom': {originalEvent?: WheelEvent | TouchEvent} | void;

    /**
     * Fired just after the map completes a transition from one zoom level to another
     * as the result of either user interaction or methods such as {@link Map#flyTo}.
     * The zoom transition will usually end before rendering is finished, so if you
     * need to wait for rendering to finish, use the {@link Map.event:idle} event instead.
     *
     * @event zoomend
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just after a zoom transition finishes.
     * map.on('zoomend', () => {
     *     console.log('A zoomend event occurred.');
     * });
     */
    'zoomend': {originalEvent?: WheelEvent | TouchEvent} | void;

    /**
     * Fired when a "drag to rotate" interaction starts. See {@link DragRotateHandler}.
     *
     * @event rotatestart
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just before a "drag to rotate" interaction starts.
     * map.on('rotatestart', () => {
     *     console.log('A rotatestart event occurred.');
     * });
     */
    'rotatestart': {originalEvent?: MouseEvent | TouchEvent};

    /**
     * Fired repeatedly during a "drag to rotate" interaction. See {@link DragRotateHandler}.
     *
     * @event rotate
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // repeatedly during "drag to rotate" interaction.
     * map.on('rotate', () => {
     *     console.log('A rotate event occurred.');
     * });
     */
    'rotate': {originalEvent?: MouseEvent | TouchEvent};

    /**
     * Fired when a "drag to rotate" interaction ends. See {@link DragRotateHandler}.
     *
     * @event rotateend
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just after a "drag to rotate" interaction ends.
     * map.on('rotateend', () => {
     *     console.log('A rotateend event occurred.');
     * });
     */
    'rotateend': {originalEvent?: MouseEvent | TouchEvent};

    /**
     * Fired whenever the map's pitch (tilt) begins a change as
     * the result of either user interaction or methods such as {@link Map#flyTo} .
     *
     * @event pitchstart
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just before a pitch (tilt) transition starts.
     * map.on('pitchstart', () => {
     *     console.log('A pitchstart event occurred.');
     * });
     */
    'pitchstart': {originalEvent?: MouseEvent | TouchEvent} | void;

    /**
     * Fired repeatedly during the map's pitch (tilt) animation between
     * one state and another as the result of either user interaction
     * or methods such as {@link Map#flyTo}.
     *
     * @event pitch
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // repeatedly during a pitch (tilt) transition.
     * map.on('pitch', () => {
     *     console.log('A pitch event occurred.');
     * });
     */
    'pitch': {originalEvent?: MouseEvent | TouchEvent} | void;

    /**
     * Fired immediately after the map's pitch (tilt) finishes changing as
     * the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event pitchend
     * @memberof Map
     * @instance
     * @type {MapMouseEvent | MapTouchEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just after a pitch (tilt) transition ends.
     * map.on('pitchend', () => {
     *     console.log('A pitchend event occurred.');
     * });
     */
    'pitchend': {originalEvent?: MouseEvent | TouchEvent} | void;

    /**
     * Fired when a "box zoom" interaction starts. See {@link BoxZoomHandler}.
     *
     * @event boxzoomstart
     * @memberof Map
     * @instance
     * @type {MapBoxZoomEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just before a "box zoom" interaction starts.
     * map.on('boxzoomstart', () => {
     *     console.log('A boxzoomstart event occurred.');
     * });
     */
    'boxzoomstart': {originalEvent?: MouseEvent | KeyboardEvent};

    /**
     * Fired when a "box zoom" interaction ends.  See {@link BoxZoomHandler}.
     *
     * @event boxzoomend
     * @memberof Map
     * @instance
     * @type {MapBoxZoomEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just after a "box zoom" interaction ends.
     * map.on('boxzoomend', () => {
     *     console.log('A boxzoomend event occurred.');
     * });
     */
    'boxzoomend': {originalEvent?: MouseEvent};

    /**
     * Fired when the user cancels a "box zoom" interaction, or when the bounding box does not meet the minimum size threshold.
     * See {@link BoxZoomHandler}.
     *
     * @event boxzoomcancel
     * @memberof Map
     * @instance
     * @type {MapBoxZoomEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // the user cancels a "box zoom" interaction.
     * map.on('boxzoomcancel', () => {
     *     console.log('A boxzoomcancel event occurred.');
     * });
     */
    'boxzoomcancel': {originalEvent?: MouseEvent | KeyboardEvent};

    /**
     * Fired immediately after the map has been resized.
     *
     * @event resize
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // immediately after the map has been resized.
     * map.on('resize', () => {
     *     console.log('A resize event occurred.');
     * });
     */
    'resize': object | void;

    /** @section Lifecycle */

    /**
     * Fired immediately after all necessary resources have been downloaded
     * and the first visually complete rendering of the map has occurred.
     *
     * @event load
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the map has finished loading.
     * map.on('load', () => {
     *     console.log('A load event occurred.');
     * });
     * @see [Example: Draw GeoJSON points](https://www.mapbox.com/mapbox-gl-js/example/geojson-markers/)
     * @see [Example: Add live realtime data](https://www.mapbox.com/mapbox-gl-js/example/live-geojson/)
     * @see [Example: Animate a point](https://www.mapbox.com/mapbox-gl-js/example/animate-point-along-line/)
     */
    'load': void;

    /**
     * Fired whenever the rendering process of the map is started.
     * This event can be used in pair with the "render" event,
     * to measure the time spent on the CPU during the rendering
     * of a single frame.
     *
     * @event renderstart
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the map begins rendering.
     * map.on('renderstart', () => {
     *     console.log('A renderstart event occurred.');
     * });
     */
    'renderstart': void;

    /**
     * Fired whenever the map is drawn to the screen, as the result of:
     *
     * - a change to the map's position, zoom, pitch, or bearing
     * - a change to the map's style
     * - a change to a GeoJSON source
     * - the loading of a vector tile, GeoJSON file, glyph, or sprite.
     *
     * @event render
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // whenever the map is drawn to the screen.
     * map.on('render', () => {
     *     console.log('A render event occurred.');
     * });
     */
    'render': void;

    /**
     * Fired after the last frame rendered before the map enters an
     * "idle" state:
     *
     * - No camera transitions are in progress
     * - All currently requested tiles have loaded
     * - All fade/transition animations have completed.
     *
     * @event idle
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just before the map enters an "idle" state.
     * map.on('idle', () => {
     *     console.log('A idle event occurred.');
     * });
     */
    'idle': void;

    /**
     * Fired immediately after the map has been removed with {@link Map.event:remove}.
     *
     * @event remove
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // just after the map is removed.
     * map.on('remove', () => {
     *     console.log('A remove event occurred.');
     * });
     */
    'remove': void;

    /**
     * Fired when an error occurs. This is Mapbox GL JS's primary error reporting
     * mechanism. We use an event instead of `throw` to better accommodate
     * asyncronous operations. If no listeners are bound to the `error` event, the
     * error will be printed to the console.
     *
     * @event error
     * @memberof Map
     * @instance
     * @property {string} message Error message.
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when an error occurs.
     * map.on('error', () => {
     *     console.log('A error event occurred.');
     * });
     */
    'error': {error: Error};

    /**
     * Fired when the WebGL context is lost.
     *
     * @event webglcontextlost
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the WebGL context is lost.
     * map.on('webglcontextlost', () => {
     *     console.log('A webglcontextlost event occurred.');
     * });
     */
    'webglcontextlost': {originalEvent?: WebGLContextEvent}

    /**
     * Fired when the WebGL context is restored.
     *
     * @event webglcontextrestored
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the WebGL context is restored.
     * map.on('webglcontextrestored', () => {
     *     console.log('A webglcontextrestored event occurred.');
     * });
     */
    'webglcontextrestored': {originalEvent?: WebGLContextEvent};

    /** @section Data loading */

    /**
     * Fired when any map data loads or changes. See {@link MapDataEvent}
     * for more information.
     *
     * @event data
     * @memberof Map
     * @instance
     * @type {MapDataEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when map data loads or changes.
     * map.on('data', () => {
     *     console.log('A data event occurred.');
     * });
     * @see [Example: Display HTML clusters with custom properties](https://docs.mapbox.com/mapbox-gl-js/example/cluster-html/)
     */
    'data': MapDataEvent;

    /**
     * Fired when the map's style loads or changes. See
     * {@link MapDataEvent} for more information.
     *
     * @event styledata
     * @memberof Map
     * @instance
     * @type {MapDataEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the map's style loads or changes.
     * map.on('styledata', () => {
     *     console.log('A styledata event occurred.');
     * });
     */
    'styledata': MapStyleDataEvent;

    /**
     * Fired when one of the map's sources loads or changes, including if a tile belonging
     * to a source loads or changes. See {@link MapDataEvent} for more information.
     *
     * @event sourcedata
     * @memberof Map
     * @instance
     * @type {MapDataEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when one of the map's sources loads or changes.
     * map.on('sourcedata', () => {
     *     console.log('A sourcedata event occurred.');
     * });
     */
    'sourcedata': MapSourceDataEvent;

    /**
     * Fired when any map data (style, source, tile, etc) begins loading or
     * changing asynchronously. All `dataloading` events are followed by a `data`
     * or `error` event. See {@link MapDataEvent} for more information.
     *
     * @event dataloading
     * @memberof Map
     * @instance
     * @type {MapDataEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when any map data begins loading
     * // or changing asynchronously.
     * map.on('dataloading', () => {
     *     console.log('A dataloading event occurred.');
     * });
     */
    'dataloading': MapDataEvent;

    /**
     * Fired when the map's style begins loading or changing asynchronously.
     * All `styledataloading` events are followed by a `styledata`
     * or `error` event. See {@link MapDataEvent} for more information.
     *
     * @event styledataloading
     * @memberof Map
     * @instance
     * @type {MapDataEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the map's style begins loading or
     * // changing asynchronously.
     * map.on('styledataloading', () => {
     *     console.log('A styledataloading event occurred.');
     * });
     */
    'styledataloading': MapStyleDataEvent;

    /**
     * Fired when one of the map's sources begins loading or changing asynchronously.
     * All `sourcedataloading` events are followed by a `sourcedata` or `error` event.
     * See {@link MapDataEvent} for more information.
     *
     * @event sourcedataloading
     * @memberof Map
     * @instance
     * @type {MapDataEvent}
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the map's sources begin loading or
     * // changing asynchronously.
     * map.on('sourcedataloading', () => {
     *     console.log('A sourcedataloading event occurred.');
     * });
     */
    'sourcedataloading': MapSourceDataEvent;

    /**
     * Fired when an icon or pattern needed by the style is missing. The missing image can
     * be added with {@link Map#addImage} within this event listener callback to prevent the image from
     * being skipped. This event can be used to dynamically generate icons and patterns.
     *
     * @event styleimagemissing
     * @memberof Map
     * @instance
     * @property {string} id The id of the missing image.
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when an icon or pattern is missing.
     * map.on('styleimagemissing', () => {
     *     console.log('A styleimagemissing event occurred.');
     * });
     * @see [Example: Generate and add a missing icon to the map](https://mapbox.com/mapbox-gl-js/example/add-image-missing-generated/)
     */
    'styleimagemissing': {id: string};

    /**
     * Fired immediately after all style resources have been downloaded
     * and the first visually complete rendering of the base style has occurred.
     *
     * In general, it's recommended to add custom sources and layers after this event.
     * This approach allows for a more efficient initialization and faster rendering
     * of the added layers.
     *
     * @event style.load
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the map has finished loading.
     * map.on('style.load', () => {
     *     console.log('A style load event occurred.');
     * });
     * @see [Example: Persist layers when switching base style](https://www.mapbox.com/mapbox-gl-js/example/style-switch)
     */
    'style.load': void;

    /* eslint-disable jsdoc/valid-types */
    /**
     * Fired immediately after imported style resources have been downloaded
     * and the first visually complete rendering of the base style extended with the imported style has occurred.
     *
     * @event style.import.load
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * const map = new mapboxgl.Map({});
     * // Set an event listener that fires
     * // when the style import has finished loading.
     * map.on('style.import.load', () => {
     *     console.log('A style import load event occurred.');
     * });
     */
    'style.import.load': void;
    /* eslint-enable jsdoc/valid-types */

    /**
     * Fired after speed index calculation is completed if `speedIndexTiming` option has been set to `true`.
     *
     * @private
     * @event speedindexcompleted
     * @memberof Map
     * @instance
     * @example
     * // Initialize the map
     * var map = new mapboxgl.Map({});
     * map.speedIndexTiming = true;
     * // Set an event listener that fires
     * // after speed index calculation is completed.
     * map.on('speedindexcompleted', function() {
     *   console.log(`speed index is ${map.speedIndexNumber}`);
     * });
     */
    'speedindexcompleted': {speedIndex: number};

    /**
     * Fired after RTL text plugin state changes.
     *
     * @event pluginStateChange
     * @instance
     * @private
     */
    'pluginStateChange': {pluginStatus: string, pluginURL: string};

    /**
     * Fired in worker.js after sprite loaded.
     *
     * @event pluginStateChange
     * @instance
     * @private
     */
    'isSpriteLoaded': void;

    /**
     * Fired in style.js after layer order changed.
     *
     * @event neworder
     * @instance
     * @private
     */
    'neworder': void;

    /**
     * @event colorthemeset
     * @instance
     * @private
     */
    'colorthemeset': void;

    /**
     * @private
     */
    'gpu-timing-frame': {cpuTime: number, gpuTime: number};

    /**
     * @private
     */
    'gpu-timing-layer': {layerTimes: {[layerId: string]: number}};

    /**
     * @private
     */
    'gpu-timing-deferred-render': {gpuTime: number};
};

/**
 * Utility type that represents all possible Map event types.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type MapEventType = keyof MapEvents & string;

/**
 * Utility type that maps event types to their corresponding event object type.
 *
 * @example
 * type LoadEvent = MapEvent<'load'>; // equivalent to { type: 'load', target: Map }
 *
 * type MoveEvent = MapEvent<'move'>; // equivalent to { type: 'move', target: Map, originalEvent?: MouseEvent | WheelEvent | TouchEvent }
 */
export type MapEventOf<Type extends MapEventType> = EventOf<MapEvents, Type, Map>;

export type MapEvent = MapEventOf<MapEventType>;
