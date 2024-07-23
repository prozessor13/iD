import { dispatch as d3_dispatch } from 'd3-dispatch';
import RBush from 'rbush';
import { utilRebind, utilTiler, utilQsString, utilStringQs, utilUniqueDomId} from '../util';
import { geoScaleToZoom } from '../geo';
import pannellumPhotoFrame from './pannellum_photo';

const minMaxZoom = [16, 22];
const dispatch = d3_dispatch('loadedImages', 'loadedLines', 'viewerChanged');

let _cache;
let _loadViewerPromise;
let _pannellumFrame;
let _currentScene = {
    currentImage : null,
    nextImage : null,
    prevImage : null
};
let _activeImage;


// Partition viewport into higher zoom tiles
function partitionViewport(projection) {
    const z = geoScaleToZoom(projection.scale());
    const z2 = (Math.ceil(z * 2) / 2) + 2.5;   // round to next 0.5 and add 2.5
    const tiler = utilTiler().zoomExtent([z2, z2]);

    return tiler.getTiles(projection)
        .map(function(tile) { return tile.extent; });
}


// Return no more than `limit` results per partition.
function searchLimited(limit, projection, rtree) {
    limit = limit || 5;

    return partitionViewport(projection)
        .reduce(function(result, extent) {
            const found = rtree.search(extent.bbox())
                .slice(0, limit)
                .map(function(d) { return d.data; });

            return (found.length ? result.concat(found) : result);
        }, []);
}


// Load all data for the specified type from one vector tile
function loadTile(tile) {
    const cache = _cache.requests;
    const tileId = tile.id;
    if (cache.loaded[tileId] || cache.inflight[tileId]) return;
    const controller = new AbortController();
    cache.inflight[tileId] = controller;
    const bbox = tile.extent.bbox();
    fetch(`${window.HUDHUD_STREETVIEW_API}?bbox=${[bbox.minX, bbox.minY, bbox.maxX, bbox.maxY].join(",")}`, { signal: controller.signal })
        .then(function(response) {
            if (!response.ok) {
                throw new Error(response.status + ' ' + response.statusText);
            }
            cache.loaded[tileId] = true;
            delete cache.inflight[tileId];
            return response.json();
        })
        .then(function(res) {
            features = [];
            const cache = _cache.images;
            const images = res && res.data && res.data.length ? res.data : [];
            for (let i of images) {
                const loc = [i.point.lon, i.point.lat];
                d = {
                    id: i.id,
                    ca: JSON.parse(i.metadata).GPSImgDirection || 0,
                    loc: loc,
                    image_path: i.url,
                    captured_at: new Date(i.created_at)
                };
                cache.forImageId[d.id] = d;
                features.push({
                    minX: loc[0], minY: loc[1], maxX: loc[0], maxY: loc[1], data: d
                });
            }
            if (cache.rtree) {
                cache.rtree.load(features);
            }

            dispatch.call('loadedImages');
        })
        .catch(function (e) {
            if (e.message === 'No Data') {
                cache.loaded[tileId] = true;
            } else {
                console.error(e); // eslint-disable-line no-console
            }
        });
}

export default {
    init: function() {
        if (!_cache) {
            this.reset();
        }

        this.event = utilRebind(this, dispatch, 'on');
    },

    reset: function() {
        if (_cache) {
            Object.values(_cache.requests.inflight).forEach(function(request) { request.abort(); });
        }

        _cache = {
            images: { rtree: new RBush(), forImageId: {} },
            requests: { loaded: {}, inflight: {} }
        };

        _currentScene.currentImage = null;
        _activeImage = null;
    },

    // Get visible images
    images: function(projection) {
        const limit = 5;
        return searchLimited(limit, projection, _cache.images.rtree);
    },

    cachedImage: function(imageKey) {
        return _cache.images.forImageId[imageKey];
    },

    // Load images in the visible area
    loadImages: function(projection) {
      const tiler = utilTiler().zoomExtent(minMaxZoom).skipNullIsland(true);
      const tiles = tiler.getTiles(projection);

      tiles.forEach(function(tile) {
          loadTile(tile);
      });
    },

    // Set the currently visible image
    setActiveImage: function(image) {
        if (image) {
            _activeImage = {
                id: image.id,
            };
        } else {
            _activeImage = null;
        }
    },

    getActiveImage: function(){
        return _activeImage;
    },

    // Update the currently highlighted image.
    setStyles: function(context, hovered) {
        const hoveredImageId =  hovered && hovered.id;
        const selectedImageId = _activeImage && _activeImage.id;

        const markers = context.container().selectAll('.layer-hudhudstreets .viewfield-group');

        markers
            .classed('highlighted', function(d) { return d.id === selectedImageId; })
            .classed('hovered', function(d) { return d.id === hoveredImageId; })
            .classed('currentView', function(d) { return d.id === selectedImageId; });

        // update viewfields if needed
        context.container().selectAll('.layer-hudhudstreets .viewfield-group .viewfield')
            .attr('d', viewfieldPath);

        function viewfieldPath() {
            let d = this.parentNode.__data__;
            if (d.id !== selectedImageId) {
                return '';
            } else {
                return 'M 6,9 C 8,8.4 8,8.4 10,9 L 16,-2 C 12,-5 4,-5 0,-2 z';
            }
        }

        return this;
    },

    selectImage: function (context, id) {
        let that = this;

        let d = that.cachedImage(id);
        that.setActiveImage(d);

        let viewer = context.container()
            .select('.photoviewer');

        if (!viewer.empty()) viewer.datum(d);

        this.setStyles(context, null);

        if (!d) return this;

        let wrap = context.container()
            .select('.photoviewer .hudhudstreets-wrapper');

        _pannellumFrame
            .selectPhoto(d, true)
            .showPhotoFrame(wrap);

        return this;
    },

    photoFrame: function() {
        return _pannellumFrame;
    },

    ensureViewerLoaded: function(context) {

        let that = this;

        let imgWrap = context.container()
            .select('#ideditor-viewer-hudhudstreets-simple > img');

        if (!imgWrap.empty()) {
            imgWrap.remove();
        }

        if (_loadViewerPromise) return _loadViewerPromise;

        let wrap = context.container()
            .select('.photoviewer')
            .selectAll('.hudhudstreets-wrapper')
            .data([0]);

        let wrapEnter = wrap.enter()
            .append('div')
            .attr('class', 'photo-wrapper hudhudstreets-wrapper')
            .classed('hide', true)
            .on('dblclick.zoom', null);

        wrapEnter
            .append('div')
            .attr('class', 'photo-attribution fillD');

        // Register viewer resize handler
        _loadViewerPromise = Promise.all([
            pannellumPhotoFrame.init(context, wrapEnter)
        ]).then(([pannellumPhotoFrame]) => {
            _pannellumFrame = pannellumPhotoFrame;
            _pannellumFrame.event.on('viewerChanged', () => dispatch.call('viewerChanged'));
        });

        return _loadViewerPromise;
    },

    showViewer: function (context) {
        let wrap = context.container().select('.photoviewer')
            .classed('hide', false);
        let isHidden = wrap.selectAll('.photo-wrapper.hudhudstreets-wrapper.hide').size();
        if (isHidden) {
            wrap
                .selectAll('.photo-wrapper:not(.hudhudstreets-wrapper)')
                .classed('hide', true);
            wrap
                .selectAll('.photo-wrapper.hudhudstreets-wrapper')
                .classed('hide', false);
        }
        return this;
    },

    hideViewer: function (context) {
        let viewer = context.container().select('.photoviewer');
        if (!viewer.empty()) viewer.datum(null);
        viewer
            .classed('hide', true)
            .selectAll('.photo-wrapper')
            .classed('hide', true);
        context.container().selectAll('.viewfield-group, .sequence, .icon-sign')
            .classed('currentView', false);
        this.setActiveImage();
        return this.setStyles(context, null);
    },

    cache: function() {
        return _cache;
    }
};
