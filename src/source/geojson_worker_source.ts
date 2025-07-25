import {getJSON} from '../util/ajax';
import {getPerformanceMeasurement} from '../util/performance';
import GeoJSONWrapper from './geojson_wrapper';
import GeoJSONRT from './geojson_rt';
import writePbf from './vector_tile_to_pbf';
import Supercluster from 'supercluster';
import geojsonvt from 'geojson-vt';
import assert from 'assert';
import VectorTileWorkerSource from './vector_tile_worker_source';
import {createExpression} from '../style-spec/expression/index';

import type {
    WorkerSourceVectorTileRequest,
    WorkerSourceVectorTileCallback,
} from '../source/worker_source';
import type Actor from '../util/actor';
import type StyleLayerIndex from '../style/style_layer_index';
import type {Feature} from './geojson_wrapper';
import type {Feature as ExpressionFeature} from '../style-spec/expression/index';
import type {LoadVectorDataCallback} from './load_vector_tile';
import type {RequestParameters, ResponseCallback} from '../util/ajax';
import type {Callback} from '../types/callback';
import type {ImageId} from '../style-spec/expression/types/image_id';
import type {StyleModelMap} from '../style/style_mode';

export type GeoJSONWorkerOptions = {
    source: string;
    scope: string;
    cluster: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    superclusterOptions?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geojsonVtOptions?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clusterProperties?: any;
    filter?: Array<unknown>;
    dynamic?: boolean;
};

export type LoadGeoJSONParameters = GeoJSONWorkerOptions & {
    request?: RequestParameters;
    data?: string;
    append?: boolean;
};

type FeatureCollectionOrFeature = GeoJSON.FeatureCollection | GeoJSON.Feature;

type ResourceTiming = Record<string, PerformanceResourceTiming[]>;

export type LoadGeoJSONResult = FeatureCollectionOrFeature & {resourceTiming?: ResourceTiming};

export type LoadGeoJSON = (params: LoadGeoJSONParameters, callback: ResponseCallback<LoadGeoJSONResult>) => void;

export interface GeoJSONIndex {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getTile: (z: number, x: number, y: number) => any;
    // supercluster methods
    getClusterExpansionZoom?: (clusterId: number) => number;
    getChildren?: (clusterId: number) => Array<GeoJSON.Feature>;
    getLeaves?: (clusterId: number, limit: number, offset: number) => Array<GeoJSON.Feature>;
}

function loadGeoJSONTile(params: WorkerSourceVectorTileRequest, callback: LoadVectorDataCallback): undefined {
    const canonical = params.tileID.canonical;

    if (!this._geoJSONIndex) {
        callback(null, null); // we couldn't load the file
        return;
    }

    const geoJSONTile = this._geoJSONIndex.getTile(canonical.z, canonical.x, canonical.y);
    if (!geoJSONTile) {
        callback(null, null); // nothing in the given tile
        return;
    }

    // HACK: separate elevation features into separate layer
    const isElevationfeature = (f) => f.tags && '3d_elevation_id' in f.tags && 'source' in f.tags && f.tags.source === 'elevation';
    const elevationFeatures = geoJSONTile.features.filter(f => isElevationfeature(f));

    let layers: Record<string, Feature[]> = {
        _geojsonTileLayer: geoJSONTile.features
    };

    if (elevationFeatures.length > 0) {
        const nonElevationFeatures = geoJSONTile.features.filter(f => !isElevationfeature(f));
        layers = {
            _geojsonTileLayer: nonElevationFeatures,
            'hd_road_elevation': elevationFeatures
        };
    }
    const vectorTile = new GeoJSONWrapper(layers);

    // Encode the geojson-vt tile into binary vector tile form.  This
    // is a convenience that allows `FeatureIndex` to operate the same way
    // across `VectorTileSource` and `GeoJSONSource` data.
    const rawData = writePbf(layers).buffer as ArrayBuffer;

    callback(null, {vectorTile, rawData});
}

/**
 * The {@link WorkerSource} implementation that supports {@link GeoJSONSource}.
 * This class is designed to be easily reused to support custom source types
 * for data formats that can be parsed/converted into an in-memory GeoJSON
 * representation.  To do so, create it with
 * `new GeoJSONWorkerSource(actor, layerIndex, customLoadGeoJSONFunction)`.
 * For a full example, see [mapbox-gl-topojson](https://github.com/developmentseed/mapbox-gl-topojson).
 *
 * @private
 */
class GeoJSONWorkerSource extends VectorTileWorkerSource {
    _geoJSONIndex: GeoJSONIndex;
    _dynamicIndex: GeoJSONRT;

    /**
     * @param [loadGeoJSON] Optional method for custom loading/parsing of
     * GeoJSON based on parameters passed from the main-thread Source.
     * See {@link GeoJSONWorkerSource#loadGeoJSON}.
     * @private
     */
    constructor(actor: Actor, layerIndex: StyleLayerIndex, availableImages: ImageId[], availableModels: StyleModelMap, isSpriteLoaded: boolean, loadGeoJSON?: LoadGeoJSON | null, brightness?: number | null) {
        super(actor, layerIndex, availableImages, availableModels, isSpriteLoaded, loadGeoJSONTile, brightness);
        if (loadGeoJSON) {
            this.loadGeoJSON = loadGeoJSON;
        }
        this._dynamicIndex = new GeoJSONRT();
    }

    /**
     * Fetches (if appropriate), parses, and index geojson data into tiles. This
     * preparatory method must be called before {@link GeoJSONWorkerSource#loadTile}
     * can correctly serve up tiles.
     *
     * Defers to {@link GeoJSONWorkerSource#loadGeoJSON} for the fetching/parsing,
     * expecting `callback(error, data)` to be called with either an error or a
     * parsed GeoJSON object.
     *
     * When `loadData` requests come in faster than they can be processed,
     * they are coalesced into a single request using the latest data.
     * See {@link GeoJSONWorkerSource#coalesce}
     *
     * @private
     */
    loadData(params: LoadGeoJSONParameters, callback: ResponseCallback<{resourceTiming?: ResourceTiming}>): void {
        const requestParam = params && params.request;
        const perf = requestParam && requestParam.collectResourceTiming;

        this._geoJSONIndex = null;

        this.loadGeoJSON(params, (err?: Error, data?: FeatureCollectionOrFeature) => {
            if (err || !data) {
                return callback(err);

            } else if (typeof data !== 'object') {
                return callback(new Error(`Input data given to '${params.source}' is not a valid GeoJSON object.`));

            } else {
                try {
                    if (params.filter) {
                        const compiled = createExpression(params.filter, {type: 'boolean', 'property-type': 'data-driven', overridable: false, transition: false});
                        if (compiled.result === 'error')
                            throw new Error(compiled.value.map(err => `${err.key}: ${err.message}`).join(', '));

                        (data as GeoJSON.FeatureCollection).features = (data as GeoJSON.FeatureCollection).features.filter(feature => compiled.value.evaluate({zoom: 0}, feature as unknown as ExpressionFeature));
                    }

                    // for GeoJSON sources that are marked as dynamic, we retain the GeoJSON data
                    // as a id-to-feature map so that we can later update features by id individually
                    if (params.dynamic) {
                        if (data.type === 'Feature') data = {type: 'FeatureCollection', features: [data]};

                        if (!params.append) {
                            this._dynamicIndex.clear();
                            this.loaded = {};
                        }

                        this._dynamicIndex.load(data.features, this.loaded);

                        if (params.cluster) data.features = this._dynamicIndex.getFeatures() as unknown as GeoJSON.Feature[];

                    } else {
                        this.loaded = {};
                    }

                    this._geoJSONIndex =
                        params.cluster ? new Supercluster(getSuperclusterOptions(params)).load((data as GeoJSON.FeatureCollection).features as Array<GeoJSON.Feature<GeoJSON.Point, object>>) :
                        params.dynamic ? this._dynamicIndex :
                        geojsonvt(data, params.geojsonVtOptions);

                } catch (err) {
                    return callback(err);
                }

                const result: {resourceTiming?: ResourceTiming} = {};
                if (perf) {
                    const resourceTimingData = getPerformanceMeasurement(requestParam);
                    // it's necessary to eval the result of getEntriesByName() here via parse/stringify
                    // late evaluation in the main thread causes TypeError: illegal invocation
                    if (resourceTimingData) {
                        result.resourceTiming = {};
                        result.resourceTiming[params.source] = JSON.parse(JSON.stringify(resourceTimingData));
                    }
                }
                callback(null, result);
            }
        });
    }

    /**
    * Implements {@link WorkerSource#reloadTile}.
    *
    * If the tile is loaded, uses the implementation in VectorTileWorkerSource.
    * Otherwise, such as after a setData() call, we load the tile fresh.
    *
    * @private
    */
    override reloadTile(params: WorkerSourceVectorTileRequest, callback: WorkerSourceVectorTileCallback): void {
        const loaded = this.loaded,
            uid = params.uid;

        if (loaded && loaded[uid]) {
            if (params.partial) {
                return callback(null, undefined);
            }
            return super.reloadTile(params, callback);
        } else {
            return this.loadTile(params, callback);
        }
    }

    /**
     * Fetch and parse GeoJSON according to the given params.  Calls `callback`
     * with `(err, data)`, where `data` is a parsed GeoJSON object.
     *
     * GeoJSON is loaded and parsed from `params.url` if it exists, or else
     * expected as a literal (string or object) `params.data`.
     *
     * @param params
     * @param [params.url] A URL to the remote GeoJSON data.
     * @param [params.data] Literal GeoJSON data. Must be provided if `params.url` is not.
     * @private
     */
    loadGeoJSON(params: LoadGeoJSONParameters, callback: ResponseCallback<FeatureCollectionOrFeature>): void {
        // Because of same origin issues, urls must either include an explicit
        // origin or absolute path.
        // ie: /foo/bar.json or http://example.com/bar.json
        // but not ../foo/bar.json
        if (params.request) {
            getJSON(params.request, callback);
        } else if (typeof params.data === 'string') {
            // delay loading by one tick to hopefully let GC clean up the previous index (if present)
            setTimeout(() => {
                try {
                    return callback(null, JSON.parse(params.data));
                } catch (e) {
                    return callback(new Error(`Input data given to '${params.source}' is not a valid GeoJSON object.`));
                }
            }, 0);
        } else {
            return callback(new Error(`Input data given to '${params.source}' is not a valid GeoJSON object.`));
        }
    }

    getClusterExpansionZoom(params: {
        clusterId: number;
    }, callback: Callback<number>) {
        try {
            callback(null, this._geoJSONIndex.getClusterExpansionZoom(params.clusterId));
        } catch (e) {
            callback(e);
        }
    }

    getClusterChildren(params: {
        clusterId: number;
    }, callback: Callback<Array<GeoJSON.Feature>>) {
        try {
            callback(null, this._geoJSONIndex.getChildren(params.clusterId));
        } catch (e) {
            callback(e);
        }
    }

    getClusterLeaves(params: {
        clusterId: number;
        limit: number;
        offset: number;
    }, callback: Callback<Array<GeoJSON.Feature>>) {
        try {
            callback(null, this._geoJSONIndex.getLeaves(params.clusterId, params.limit, params.offset));
        } catch (e) {
            callback(e);
        }
    }
}

function getSuperclusterOptions({
    superclusterOptions,
    clusterProperties,
}: LoadGeoJSONParameters) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (!clusterProperties || !superclusterOptions) return superclusterOptions;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapExpressions: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reduceExpressions: Record<string, any> = {};
    const globals = {accumulated: null, zoom: 0};
    const feature = {properties: null};
    const propertyNames = Object.keys(clusterProperties);

    for (const key of propertyNames) {
        const [operator, mapExpression] = clusterProperties[key];

        const mapExpressionParsed = createExpression(mapExpression);
        const reduceExpressionParsed = createExpression(
            typeof operator === 'string' ? [operator, ['accumulated'], ['get', key]] : operator);

        assert(mapExpressionParsed.result === 'success');
        assert(reduceExpressionParsed.result === 'success');

        mapExpressions[key] = mapExpressionParsed.value;
        reduceExpressions[key] = reduceExpressionParsed.value;
    }

    superclusterOptions.map = (pointProperties) => {
        feature.properties = pointProperties;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const properties: Record<string, any> = {};
        for (const key of propertyNames) {
            properties[key] = mapExpressions[key].evaluate(globals, feature);
        }
        return properties;
    };
    superclusterOptions.reduce = (accumulated, clusterProperties) => {
        feature.properties = clusterProperties;
        for (const key of propertyNames) {
            globals.accumulated = accumulated[key];
            accumulated[key] = reduceExpressions[key].evaluate(globals, feature);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return superclusterOptions;
}

export default GeoJSONWorkerSource;
