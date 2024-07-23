import _throttle from 'lodash-es/throttle';
import { select as d3_select } from 'd3-selection';
import { svgPointTransform } from './helpers';
import { services } from '../services';


export function svgHudhudStreets(projection, context, dispatch) {
    var throttledRedraw = _throttle(function () { dispatch.call('change'); }, 1000);
    var minZoom = 16;
    var minMarkerZoom = 16;
    var minViewfieldZoom = 18;
    var layer = d3_select(null);
    var _viewerYaw = 0;
    var _hudhudstreets;

    /**
     * init().
     */
    function init() {
        if (svgHudhudStreets.initialized) return;  // run once
        svgHudhudStreets.enabled = false;
        svgHudhudStreets.initialized = true;
    }

    /**
     * getService().
     */
    function getService() {
        if (services.hudhudstreets && !_hudhudstreets) {
            _hudhudstreets = services.hudhudstreets;
            _hudhudstreets.event
                .on('viewerChanged.svgHudhudStreets', viewerChanged)
                .on('loadedImages.svgHudhudStreets', throttledRedraw);
        } else if (!services.hudhudstreets && _hudhudstreets) {
            _hudhudstreets = null;
        }

        return _hudhudstreets;
    }

    /**
     * showLayer().
     */
    function showLayer() {
        var service = getService();
        if (!service) return;

        editOn();

        layer
            .style('opacity', 0)
            .transition()
            .duration(250)
            .style('opacity', 1)
            .on('end', function () { dispatch.call('change'); });
    }

    /**
     * hideLayer().
     */
    function hideLayer() {
        throttledRedraw.cancel();

        layer
            .transition()
            .duration(250)
            .style('opacity', 0)
            .on('end', editOff);
    }

    /**
     * editOn().
     */
    function editOn() {
        layer.style('display', 'block');
    }

    /**
     * editOff().
     */
    function editOff() {
        layer.selectAll('.viewfield-group').remove();
        layer.style('display', 'none');
    }

    /**
     * click() Handles 'bubble' point click event.
     */
    function click(d3_event, d) {
        var service = getService();
        if (!service) return;

        service
            .ensureViewerLoaded(context)
            .then(function() {
                service
                    .selectImage(context, d.id)
                    .showViewer(context);
            });

        context.map().centerEase(d.loc);
    }

    /**
     * mouseover().
     */
    function mouseover(d3_event, d) {
        var service = getService();
        if (service) service.setStyles(context, d);
    }

    /**
     * mouseout().
     */
    function mouseout() {
        var service = getService();
        if (service) service.setStyles(context, null);
    }

    /**
     * transform().
     */
    function transform(d) {
        var t = svgPointTransform(projection)(d);
        var rot = d.ca + _viewerYaw;
        if (rot) {
            t += ' rotate(' + Math.floor(rot) + ',0,0)';
        }
        return t;
    }


    function viewerChanged() {
        const service = getService();
        if (!service) return;

        const frame = service.photoFrame();

        // update viewfield rotation
        _viewerYaw = frame.getYaw();

        // avoid updating if the map is currently transformed
        // e.g. during drags or easing.
        // if (context.map().isTransformed()) return;

        layer.selectAll('.viewfield-group.currentView')
            .attr('transform', transform);
    }


    /**
     * update().
     */
    function update() {
        var viewer = context.container().select('.photoviewer');
        var selected = viewer.empty() ? undefined : viewer.datum();
        var z = ~~context.map().zoom();
        var showMarkers = (z >= minMarkerZoom);
        var showViewfields = (z >= minViewfieldZoom);
        var service = getService();

        var images = service && showMarkers ? service.images(projection) : [];

        var groups = layer.selectAll('.markers').selectAll('.viewfield-group')
            .data(images, function(d) { return d.id });

        // exit
        groups.exit()
            .remove();

        // enter
        var groupsEnter = groups.enter()
            .append('g')
            .attr('class', 'viewfield-group')
            .on('mouseenter', mouseover)
            .on('mouseleave', mouseout)
            .on('click', click);

        groupsEnter
            .append('g')
            .attr('class', 'viewfield-scale');

        // update
        var markers = groups
            .merge(groupsEnter)
            .sort(function(a, b) {
                return (a === selected) ? 1
                    : (b === selected) ? -1
                    : b.loc[1] - a.loc[1];
            })
            .attr('transform', transform)
            .select('.viewfield-scale');


        markers.selectAll('circle')
            .data([0])
            .enter()
            .append('circle')
            .attr('dx', '0')
            .attr('dy', '0')
            .attr('r', '6');

        var viewfields = markers.selectAll('.viewfield')
            .data(showViewfields ? [0] : []);

        viewfields.exit()
            .remove();

        // viewfields may or may not be drawn...
        // but if they are, draw below the circles
        viewfields.enter()
            .insert('path', 'circle')
            .attr('class', 'viewfield')
            .attr('transform', 'scale(1.5,1.5),translate(-8, -13)');

    }

    /**
     * drawImages()
     * drawImages is the method that is returned (and that runs) every time 'svgHudhudStreets()' is called.
     * 'svgHudhudStreets()' is called from index.js
     */
    function drawImages(selection) {
        var enabled = svgHudhudStreets.enabled;
        var service = getService();

        layer = selection.selectAll('.layer-hudhudstreets')
            .data(service ? [0] : []);

        layer.exit()
            .remove();

        var layerEnter = layer.enter()
            .append('g')
            .attr('class', 'layer-hudhudstreets')
            .style('display', enabled ? 'block' : 'none');

        layerEnter
            .append('g')
            .attr('class', 'markers');

        layer = layerEnter
            .merge(layer);

        if (enabled) {
            if (service && ~~context.map().zoom() >= minZoom) {
                editOn();
                update();
                service.loadImages(projection);
            } else {
                editOff();
            }
        }
    }


    /**
     * drawImages.enabled().
     */
    drawImages.enabled = function(_) {
        if (!arguments.length) return svgHudhudStreets.enabled;
        svgHudhudStreets.enabled = _;
        if (svgHudhudStreets.enabled) {
            showLayer();
            context.photos().on('change.hudhudstreets', update);
        } else {
            hideLayer();
            context.photos().on('change.hudhudstreets', null);
        }
        dispatch.call('change');
        return this;
    };

    /**
     * drawImages.supported().
     */
    drawImages.supported = function() {
        return !!getService();
    };

    drawImages.rendered = function(zoom) {
      return zoom >= minZoom;
    };

    init();

    return drawImages;
}
