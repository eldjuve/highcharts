/* *
 *
 *  (c) 2010-2019 Torstein Honsi
 *
 *  Extensions to the SVGRenderer class to enable 3D shapes
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

import H from '../parts/Globals.js';

/**
 * Internal types
 * @private
 */
declare global {
    namespace Highcharts {
        interface Arc3dPaths {
            out: SVGPathArray;
            inn: SVGPathArray;
            side1: SVGPathArray;
            side2: SVGPathArray;
            top: SVGPathArray;
            zInn: number;
            zOut: number;
            zSide1: number;
            zSide2: number;
            zTop: number;
        }
        interface CuboidMethodsObject extends Element3dMethodsObject {
            parts: Array<string>;
            pathType: string;
            animate(
                this: SVGElement,
                args: SVGAttributes,
                duration?: (boolean|AnimationOptionsObject),
                complete?: Function
            ): SVGElement;
            attr(
                this: SVGElement,
                args: (string|SVGAttributes),
                val?: (number|string),
                complete?: any,
                continueAnimation?: any
            ): SVGElement;
            fillSetter(this: SVGElement, fill: ColorType): SVGElement;
        }
        interface CuboidPathsObject extends SVGPath3dObject {
            front: SVGPathArray;
            isFront: number;
            isTop: number;
            side: SVGPathArray;
            top: SVGPathArray;
            zIndexes: Dictionary<number>;
        }
        interface Element3dMethodsObject {
            processParts: Function;
            singleSetterForParts: Function;
            destroyParts(this: SVGElement): void;
            initArgs(this: SVGElement, args: SVGAttributes): void;
        }
        interface Elements3dObject {
            base: Element3dMethodsObject;
            cuboid: CuboidMethodsObject;
        }
        interface SVGPath3dObject {
            back?: SVGPathArray;
            bottom?: SVGPathArray;
            front?: SVGPathArray;
            side?: SVGPathArray;
            top?: SVGPathArray;
            zIndexes?: Dictionary<number>;
        }
        interface SVGElement {
            attribs?: SVGAttributes;
            parts?: Array<string>;
            pathType?: string;
            vertexes?: Array<Position3dObject>;
            initArgs: Element3dMethodsObject['initArgs'];
            setPaths(attribs: SVGAttributes): void;
        }
        interface SVGRenderer {
            elements3d: Elements3dObject;
            arc3d(attribs: SVGAttributes): SVGElement;
            arc3dPath(shapeArgs: SVGAttributes): Arc3dPaths;
            cuboid(shapeArgs: SVGAttributes): SVGElement;
            cuboidPath(shapeArgs: SVGAttributes): CuboidPathsObject;
            element3d(type: string, shapeArgs: SVGAttributes): SVGElement;
            face3d(args?: SVGAttributes): SVGElement;
            polyhedron(args?: SVGAttributes): SVGElement;
            toLinePath(
                points: Array<PositionObject>,
                closed?: boolean
            ): SVGPathArray;
            toLineSegments(points: Array<PositionObject>): SVGPathArray;
        }
    }
}

import U from '../parts/Utilities.js';
const {
    defined,
    extend,
    objectEach,
    pick
} = U;

import '../parts/Color.js';
import '../parts/SvgRenderer.js';

var cos = Math.cos,
    PI = Math.PI,
    sin = Math.sin;

var animObject = H.animObject,
    charts = H.charts,
    color = H.color,
    deg2rad = H.deg2rad,
    merge = H.merge,
    perspective = H.perspective,
    SVGElement = H.SVGElement,
    SVGRenderer = H.SVGRenderer,
    // internal:
    dFactor: number,
    element3dMethods: Highcharts.Element3dMethodsObject,
    cuboidMethods: Highcharts.CuboidMethodsObject;

/*
    EXTENSION TO THE SVG-RENDERER TO ENABLE 3D SHAPES
*/
// HELPER METHODS
dFactor = (4 * (Math.sqrt(2) - 1) / 3) / (PI / 2);

/* eslint-disable no-invalid-this, valid-jsdoc */

/**
 * Method to construct a curved path. Can 'wrap' around more then 180 degrees.
 * @private
 */
function curveTo(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    start: number,
    end: number,
    dx: number,
    dy: number
): Highcharts.SVGPathArray {
    var result = [] as Highcharts.SVGPathArray,
        arcAngle = end - start;

    if ((end > start) && (end - start > Math.PI / 2 + 0.0001)) {
        result = result.concat(
            curveTo(cx, cy, rx, ry, start, start + (Math.PI / 2), dx, dy)
        );
        result = result.concat(
            curveTo(cx, cy, rx, ry, start + (Math.PI / 2), end, dx, dy)
        );
        return result;
    }
    if ((end < start) && (start - end > Math.PI / 2 + 0.0001)) {
        result = result.concat(
            curveTo(cx, cy, rx, ry, start, start - (Math.PI / 2), dx, dy)
        );
        result = result.concat(
            curveTo(cx, cy, rx, ry, start - (Math.PI / 2), end, dx, dy)
        );
        return result;
    }
    return [
        'C',
        cx + (rx * Math.cos(start)) -
            ((rx * dFactor * arcAngle) * Math.sin(start)) + dx,
        cy + (ry * Math.sin(start)) +
            ((ry * dFactor * arcAngle) * Math.cos(start)) + dy,
        cx + (rx * Math.cos(end)) +
            ((rx * dFactor * arcAngle) * Math.sin(end)) + dx,
        cy + (ry * Math.sin(end)) -
            ((ry * dFactor * arcAngle) * Math.cos(end)) + dy,

        cx + (rx * Math.cos(end)) + dx,
        cy + (ry * Math.sin(end)) + dy
    ];
}

SVGRenderer.prototype.toLinePath = function (
    points: Array<Highcharts.PositionObject>,
    closed?: boolean
): Highcharts.SVGPathArray {
    var result = [] as Highcharts.SVGPathArray;

    // Put "L x y" for each point
    points.forEach(function (point: Highcharts.PositionObject): void {
        result.push('L', point.x, point.y);
    });

    if (points.length) {
        // Set the first element to M
        result[0] = 'M';

        // If it is a closed line, add Z
        if (closed) {
            result.push('Z');
        }
    }

    return result;
};

SVGRenderer.prototype.toLineSegments = function (
    points: Array<Highcharts.PositionObject>
): Highcharts.SVGPathArray {
    var result = [] as Highcharts.SVGPathArray,
        m = true;

    points.forEach(function (point: Highcharts.PositionObject): void {
        result.push(m ? 'M' : 'L', point.x, point.y);
        m = !m;
    });

    return result;
};

// A 3-D Face is defined by it's 3D vertexes, and is only visible if it's
// vertexes are counter-clockwise (Back-face culling). It is used as a
// polyhedron Element
SVGRenderer.prototype.face3d = function (
    args?: Highcharts.SVGAttributes
): Highcharts.SVGElement {
    var renderer = this,
        ret: Highcharts.SVGElement = this.createElement('path');

    ret.vertexes = [];
    ret.insidePlotArea = false;
    ret.enabled = true;

    ret.attr = function (
        this: Highcharts.SVGElement,
        hash?: (string|Highcharts.SVGAttributes)
    ): (number|string|Highcharts.SVGElement) {

        if (
            typeof hash === 'object' &&
            (
                defined(hash.enabled) ||
                defined(hash.vertexes) ||
                defined(hash.insidePlotArea)
            )
        ) {
            this.enabled = pick(hash.enabled, this.enabled);
            this.vertexes = pick(hash.vertexes, this.vertexes);
            this.insidePlotArea = pick(
                hash.insidePlotArea,
                this.insidePlotArea
            );
            delete hash.enabled;
            delete hash.vertexes;
            delete hash.insidePlotArea;

            var chart = charts[renderer.chartIndex],
                vertexes2d = perspective(
                    this.vertexes as any,
                    chart as any,
                    this.insidePlotArea
                ),
                path = renderer.toLinePath(vertexes2d, true),
                area = H.shapeArea(vertexes2d),
                visibility = (this.enabled && area > 0) ? 'visible' : 'hidden';

            hash.d = path;
            hash.visibility = visibility;
        }
        return SVGElement.prototype.attr.apply(this, arguments as any);
    } as any;

    ret.animate = function (
        this: Highcharts.SVGElement,
        params: Highcharts.SVGAttributes
    ): Highcharts.SVGElement {
        if (
            typeof params === 'object' &&
            (
                defined(params.enabled) ||
                defined(params.vertexes) ||
                defined(params.insidePlotArea)
            )
        ) {
            this.enabled = pick(params.enabled, this.enabled);
            this.vertexes = pick(params.vertexes, this.vertexes);
            this.insidePlotArea = pick(
                params.insidePlotArea,
                this.insidePlotArea
            );
            delete params.enabled;
            delete params.vertexes;
            delete params.insidePlotArea;

            var chart = charts[renderer.chartIndex],
                vertexes2d = perspective(
                    this.vertexes as any,
                    chart as any,
                    this.insidePlotArea
                ),
                path = renderer.toLinePath(vertexes2d, true),
                area = H.shapeArea(vertexes2d),
                visibility = (this.enabled && area > 0) ? 'visible' : 'hidden';

            params.d = path;
            this.attr('visibility', visibility);
        }

        return SVGElement.prototype.animate.apply(this, arguments as any);
    };

    return ret.attr(args);
};

// A Polyhedron is a handy way of defining a group of 3-D faces. It's only
// attribute is `faces`, an array of attributes of each one of it's Face3D
// instances.
SVGRenderer.prototype.polyhedron = function (
    args?: Highcharts.SVGAttributes
): Highcharts.SVGElement {
    var renderer = this,
        result = this.g(),
        destroy = result.destroy;

    if (!this.styledMode) {
        result.attr({
            'stroke-linejoin': 'round'
        });
    }

    result.faces = [];


    // destroy all children
    result.destroy = function (): undefined {
        for (var i = 0; i < result.faces.length; i++) {
            result.faces[i].destroy();
        }
        return destroy.call(this);
    };

    result.attr = function (
        this: Highcharts.SVGElement,
        hash?: (string|Highcharts.SVGAttributes),
        val?: string,
        complete?: Function,
        continueAnimation?: boolean
    ): (number|string|Highcharts.SVGElement) {
        if (typeof hash === 'object' && defined(hash.faces)) {
            while (result.faces.length > hash.faces.length) {
                result.faces.pop().destroy();
            }
            while (result.faces.length < hash.faces.length) {
                result.faces.push(renderer.face3d().add(result));
            }
            for (var i = 0; i < hash.faces.length; i++) {
                if (renderer.styledMode) {
                    delete hash.faces[i].fill;
                }
                result.faces[i].attr(
                    hash.faces[i],
                    null,
                    complete,
                    continueAnimation
                );
            }
            delete hash.faces;
        }
        return SVGElement.prototype.attr.apply(this, arguments as any);
    } as any;

    result.animate = function (
        this: Highcharts.SVGElement,
        params: Highcharts.SVGAttributes,
        duration?: (boolean|Highcharts.AnimationOptionsObject),
        complete?: Function
    ): Highcharts.SVGElement {
        if (params && params.faces) {
            while (result.faces.length > params.faces.length) {
                result.faces.pop().destroy();
            }
            while (result.faces.length < params.faces.length) {
                result.faces.push(renderer.face3d().add(result));
            }
            for (var i = 0; i < params.faces.length; i++) {
                result.faces[i].animate(params.faces[i], duration, complete);
            }
            delete params.faces;
        }
        return SVGElement.prototype.animate.apply(this, arguments as any);
    };

    return result.attr(args);
};

// Base, abstract prototype member for 3D elements
element3dMethods = {
    /**
     * The init is used by base - renderer.Element
     * @private
     */
    initArgs: function (
        this: Highcharts.SVGElement,
        args: Highcharts.SVGAttributes
    ): void {
        var elem3d = this,
            renderer = elem3d.renderer,
            paths: (Highcharts.Arc3dPaths|Highcharts.CuboidPathsObject) =
                (renderer as any)[elem3d.pathType + 'Path'](args),
            zIndexes = (paths as any).zIndexes;

        // build parts
        (elem3d.parts as any).forEach(function (part: string): void {
            elem3d[part] = renderer.path((paths as any)[part]).attr({
                'class': 'highcharts-3d-' + part,
                zIndex: zIndexes[part] || 0
            }).add(elem3d);
        });

        elem3d.attr({
            'stroke-linejoin': 'round',
            zIndex: zIndexes.group
        });

        // store original destroy
        elem3d.originalDestroy = elem3d.destroy;
        elem3d.destroy = elem3d.destroyParts;
    },

    /**
     * Single property setter that applies options to each part
     * @private
     */
    singleSetterForParts: function (
        this: Highcharts.SVGElement,
        prop: string,
        val: any,
        values?: Highcharts.Dictionary<any>,
        verb?: string,
        duration?: any,
        complete?: any
    ): Highcharts.SVGElement {
        var elem3d = this,
            newAttr = {} as Highcharts.Dictionary<any>,
            optionsToApply = [null, null, (verb || 'attr'), duration, complete],
            hasZIndexes = values && values.zIndexes;

        if (!values) {
            newAttr[prop] = val;
            optionsToApply[0] = newAttr;
        } else {
            objectEach(values, function (partVal: any, part: string): void {
                newAttr[part] = {};
                newAttr[part][prop] = partVal;

                // include zIndexes if provided
                if (hasZIndexes) {
                    newAttr[part].zIndex = values.zIndexes[part] || 0;
                }
            });
            optionsToApply[1] = newAttr;
        }

        return elem3d.processParts.apply(elem3d, optionsToApply);
    },

    /**
     * Calls function for each part. Used for attr, animate and destroy.
     * @private
     */
    processParts: function (
        this: Highcharts.SVGElement,
        props: any,
        partsProps: Highcharts.Dictionary<any>,
        verb: string,
        duration?: any,
        complete?: any
    ): Highcharts.SVGElement {
        var elem3d = this;

        (elem3d.parts as any).forEach(function (part: string): void {
            // if different props for different parts
            if (partsProps) {
                props = pick(partsProps[part], false);
            }

            // only if something to set, but allow undefined
            if (props !== false) {
                elem3d[part][verb](props, duration, complete);
            }
        });
        return elem3d;
    },

    /**
     * Destroy all parts
     * @private
     */
    destroyParts: function (this: Highcharts.SVGElement): void {
        this.processParts(null, null, 'destroy');
        return this.originalDestroy();
    }
};

// CUBOID
cuboidMethods = H.merge(element3dMethods, {
    parts: ['front', 'top', 'side'],
    pathType: 'cuboid',

    attr: function (
        this: Highcharts.SVGElement,
        args: (string|Highcharts.SVGAttributes),
        val?: (number|string),
        complete?: any,
        continueAnimation?: any
    ): Highcharts.SVGElement {
        // Resolve setting attributes by string name
        if (typeof args === 'string' && typeof val !== 'undefined') {
            var key = args;

            args = {} as Highcharts.SVGAttributes;
            args[key] = val;
        }

        if ((args as any).shapeArgs || defined((args as any).x)) {
            return this.singleSetterForParts(
                'd',
                null,
                (this.renderer as any)[this.pathType + 'Path'](
                    (args as any).shapeArgs || args
                )
            );
        }

        return SVGElement.prototype.attr.call(
            this, args, undefined, complete, continueAnimation
        );
    },
    animate: function (
        this: Highcharts.SVGElement,
        args: Highcharts.SVGAttributes,
        duration?: (boolean|Highcharts.AnimationOptionsObject),
        complete?: Function
    ): Highcharts.SVGElement {
        if (defined(args.x) && defined(args.y)) {
            var paths = (this.renderer as any)[this.pathType + 'Path'](args);

            this.singleSetterForParts(
                'd', null, paths, 'animate', duration, complete
            );

            this.attr({
                zIndex: paths.zIndexes.group
            });
        } else {
            SVGElement.prototype.animate.call(this, args, duration, complete);
        }
        return this;
    },
    fillSetter: function (
        this: Highcharts.SVGElement,
        fill: Highcharts.ColorType
    ): Highcharts.SVGElement {
        this.singleSetterForParts('fill', null, {
            front: fill,
            top: color(fill).brighten(0.1).get(),
            side: color(fill).brighten(-0.1).get()
        });

        // fill for animation getter (#6776)
        this.color = this.fill = fill;

        return this;
    }
});

// set them up
SVGRenderer.prototype.elements3d = {
    base: element3dMethods,
    cuboid: cuboidMethods
};

/**
 * return result, generalization
 * @private
 * @requires highcharts-3d
 */
SVGRenderer.prototype.element3d = function (
    this: Highcharts.SVGRenderer,
    type: string,
    shapeArgs: Highcharts.SVGAttributes
): Highcharts.SVGElement {
    // base
    var ret = this.g();

    // extend
    extend(ret, (this.elements3d as any)[type]);

    // init
    ret.initArgs(shapeArgs);

    // return
    return ret;
};

// generelized, so now use simply
SVGRenderer.prototype.cuboid = function (
    this: Highcharts.SVGElement,
    shapeArgs: Highcharts.SVGAttributes
): Highcharts.SVGElement {
    return this.element3d('cuboid', shapeArgs);
};

// Generates a cuboid path and zIndexes
H.SVGRenderer.prototype.cuboidPath = function (
    this: Highcharts.SVGRenderer,
    shapeArgs: Highcharts.SVGAttributes
): Highcharts.CuboidPathsObject {
    var x = shapeArgs.x,
        y = shapeArgs.y,
        z = shapeArgs.z,
        h = shapeArgs.height,
        w = shapeArgs.width,
        d = shapeArgs.depth,
        chart = charts[this.chartIndex],
        front: Array<number>,
        back: Array<number>,
        top: Array<number>,
        bottom: Array<number>,
        left: Array<number>,
        right: Array<number>,
        shape: Array<number|Array<number>>,
        path1: Array<Highcharts.PositionObject>,
        path2: Array<Highcharts.PositionObject>,
        path3: Array<Highcharts.PositionObject>,
        isFront: number,
        isTop: number,
        isRight: number,
        options3d = (chart as any).options.chart.options3d,
        alpha = options3d.alpha,
        // Priority for x axis is the biggest,
        // because of x direction has biggest influence on zIndex
        incrementX = 10000,
        // y axis has the smallest priority in case of our charts
        // (needs to be set because of stacking)
        incrementY = 10,
        incrementZ = 100,
        zIndex = 0,

        // The 8 corners of the cube
        pArr = [{
            x: x,
            y: y,
            z: z
        }, {
            x: x + w,
            y: y,
            z: z
        }, {
            x: x + w,
            y: y + h,
            z: z
        }, {
            x: x,
            y: y + h,
            z: z
        }, {
            x: x,
            y: y + h,
            z: z + d
        }, {
            x: x + w,
            y: y + h,
            z: z + d
        }, {
            x: x + w,
            y: y,
            z: z + d
        }, {
            x: x,
            y: y,
            z: z + d
        }],

        pickShape;

    // apply perspective
    pArr = perspective(pArr, chart as any, shapeArgs.insidePlotArea);

    /**
     * helper method to decide which side is visible
     * @private
     */
    function mapPath(i: number): Highcharts.Position3dObject {
        return pArr[i];
    }

    /**
     * First value - path with specific side
     * Second  value - added information about side for later calculations.
     * Possible second values are 0 for path1, 1 for path2 and -1 for no path
     * chosen.
     * @private
     */
    pickShape = function (
        path1: Array<number>,
        path2: Array<number>
    ): Array<number|Array<number>> {
        var ret = [[] as any, -1];

        path1 = path1.map(mapPath) as any;
        path2 = path2.map(mapPath) as any;
        if (H.shapeArea(path1 as any) < 0) {
            ret = [path1 as any, 0];
        } else if (H.shapeArea(path2 as any) < 0) {
            ret = [path2 as any, 1];
        }
        return ret;
    };

    // front or back
    front = [3, 2, 1, 0];
    back = [7, 6, 5, 4];
    shape = pickShape(front, back);
    path1 = shape[0] as any;
    isFront = shape[1] as any;


    // top or bottom
    top = [1, 6, 7, 0];
    bottom = [4, 5, 2, 3];
    shape = pickShape(top, bottom);
    path2 = shape[0] as any;
    isTop = shape[1] as any;

    // side
    right = [1, 2, 5, 6];
    left = [0, 7, 4, 3];
    shape = pickShape(right, left);
    path3 = shape[0] as any;
    isRight = shape[1] as any;

    /* New block used for calculating zIndex. It is basing on X, Y and Z
       position of specific columns. All zIndexes (for X, Y and Z values) are
       added to the final zIndex, where every value has different priority. The
       biggest priority is in X and Z directions, the lowest index is for
       stacked columns (Y direction and the same X and Z positions). Big
       differences between priorities is made because we need to ensure that
       even for big changes in Y and Z parameters all columns will be drawn
       correctly. */

    if (isRight === 1) {
        zIndex += incrementX * (1000 - x);
    } else if (!isRight) {
        zIndex += incrementX * x;
    }

    zIndex += incrementY * (
        !isTop ||
        // Numbers checked empirically
        (alpha >= 0 && alpha <= 180 || alpha < 360 && alpha > 357.5) ?
            (chart as any).plotHeight - y : 10 + y
    );

    if (isFront === 1) {
        zIndex += incrementZ * (z);
    } else if (!isFront) {
        zIndex += incrementZ * (1000 - z);
    }

    return {
        front: this.toLinePath(path1, true),
        top: this.toLinePath(path2, true),
        side: this.toLinePath(path3, true),
        zIndexes: {
            group: Math.round(zIndex)
        },

        // additional info about zIndexes
        isFront: isFront,
        isTop: isTop
    }; // #4774
};

// SECTORS //
H.SVGRenderer.prototype.arc3d = function (
    attribs: Highcharts.SVGAttributes
): Highcharts.SVGElement {

    var wrapper = this.g(),
        renderer = wrapper.renderer,
        customAttribs = ['x', 'y', 'r', 'innerR', 'start', 'end'];

    /**
     * Get custom attributes. Don't mutate the original object and return an
     * object with only custom attr.
     * @private
     */
    function suckOutCustom(
        params: Highcharts.SVGAttributes
    ): (Highcharts.SVGAttributes|undefined) {
        var hasCA = false,
            ca = {} as Highcharts.SVGAttributes,
            key: string;

        params = merge(params); // Don't mutate the original object

        for (key in params) {
            if (customAttribs.indexOf(key) !== -1) {
                ca[key] = params[key];
                delete params[key];
                hasCA = true;
            }
        }
        return hasCA ? ca : (false as any);
    }

    attribs = merge(attribs);

    attribs.alpha = (attribs.alpha || 0) * deg2rad;
    attribs.beta = (attribs.beta || 0) * deg2rad;

    // Create the different sub sections of the shape
    wrapper.top = renderer.path();
    wrapper.side1 = renderer.path();
    wrapper.side2 = renderer.path();
    wrapper.inn = renderer.path();
    wrapper.out = renderer.path();

    // Add all faces
    wrapper.onAdd = function (): void {
        var parent = wrapper.parentGroup,
            className = wrapper.attr('class');

        wrapper.top.add(wrapper);

        // These faces are added outside the wrapper group because the z index
        // relates to neighbour elements as well
        ['out', 'inn', 'side1', 'side2'].forEach(function (face: string): void {
            wrapper[face]
                .attr({
                    'class': className + ' highcharts-3d-side'
                })
                .add(parent);
        });
    };

    // Cascade to faces
    ['addClass', 'removeClass'].forEach(function (fn: string): void {
        wrapper[fn] = function (): void {
            var args = arguments;

            ['top', 'out', 'inn', 'side1', 'side2'].forEach(function (
                face: string
            ): void {
                wrapper[face][fn].apply(wrapper[face], args);
            });
        };
    });

    /**
     * Compute the transformed paths and set them to the composite shapes
     * @private
     */
    wrapper.setPaths = function (attribs: Highcharts.SVGAttributes): void {

        var paths = wrapper.renderer.arc3dPath(attribs),
            zIndex = paths.zTop * 100;

        wrapper.attribs = attribs;

        wrapper.top.attr({ d: paths.top, zIndex: paths.zTop });
        wrapper.inn.attr({ d: paths.inn, zIndex: paths.zInn });
        wrapper.out.attr({ d: paths.out, zIndex: paths.zOut });
        wrapper.side1.attr({ d: paths.side1, zIndex: paths.zSide1 });
        wrapper.side2.attr({ d: paths.side2, zIndex: paths.zSide2 });


        // show all children
        wrapper.zIndex = zIndex;
        wrapper.attr({ zIndex: zIndex });

        // Set the radial gradient center the first time
        if (attribs.center) {
            wrapper.top.setRadialReference(attribs.center);
            delete attribs.center;
        }
    };
    wrapper.setPaths(attribs);

    /**
     * Apply the fill to the top and a darker shade to the sides
     * @private
     */
    wrapper.fillSetter = function (
        this: Highcharts.SVGElement,
        value: Highcharts.ColorType
    ): Highcharts.SVGElement {
        var darker = color(value).brighten(-0.1).get();

        this.fill = value;

        this.side1.attr({ fill: darker });
        this.side2.attr({ fill: darker });
        this.inn.attr({ fill: darker });
        this.out.attr({ fill: darker });
        this.top.attr({ fill: value });

        return this;
    };

    // Apply the same value to all. These properties cascade down to the
    // children when set to the composite arc3d.
    ['opacity', 'translateX', 'translateY', 'visibility'].forEach(
        function (setter: string): void {
            wrapper[setter + 'Setter'] = function (
                value: any,
                key: string
            ): void {
                wrapper[key] = value;
                ['out', 'inn', 'side1', 'side2', 'top'].forEach(function (
                    el: string
                ): void {
                    wrapper[el].attr(key, value);
                });
            };
        }
    );

    // Override attr to remove shape attributes and use those to set child paths
    wrapper.attr = function (
        this: Highcharts.SVGElement,
        params?: (string|Highcharts.SVGAttributes)
    ): (number|string|Highcharts.SVGElement) {
        var ca;

        if (typeof params === 'object') {
            ca = suckOutCustom(params);
            if (ca) {
                extend(wrapper.attribs, ca);
                wrapper.setPaths(wrapper.attribs as any);
            }
        }
        return SVGElement.prototype.attr.apply(wrapper, arguments as any);
    } as any;

    // Override the animate function by sucking out custom parameters related to
    // the shapes directly, and update the shapes from the animation step.
    wrapper.animate = function (
        this: Highcharts.SVGElement,
        params: Highcharts.SVGAttributes,
        animation?: (boolean|Highcharts.AnimationOptionsObject),
        complete?: Function
    ): Highcharts.SVGElement {
        var ca,
            from = this.attribs,
            to: Highcharts.SVGAttributes,
            anim,
            randomProp = 'data-' + Math.random().toString(26).substring(2, 9);

        // Attribute-line properties connected to 3D. These shouldn't have been
        // in the attribs collection in the first place.
        delete params.center;
        delete params.z;
        delete params.depth;
        delete params.alpha;
        delete params.beta;

        anim = animObject(pick(animation, this.renderer.globalAnimation));

        if (anim.duration) {
            ca = suckOutCustom(params);
            // Params need to have a property in order for the step to run
            // (#5765, #7097, #7437)
            wrapper[randomProp] = 0;
            params[randomProp] = 1;
            wrapper[randomProp + 'Setter'] = H.noop;

            if (ca) {
                to = ca;
                anim.step = function (a: unknown, fx: Highcharts.Fx): void {

                    /**
                     * @private
                     */
                    function interpolate(key: string): number {
                        return (from as any)[key] + (
                            pick(to[key], (from as any)[key]) -
                            (from as any)[key]
                        ) * fx.pos;
                    }

                    if (fx.prop === randomProp) {
                        (fx.elem as any).setPaths(merge(from, {
                            x: interpolate('x'),
                            y: interpolate('y'),
                            r: interpolate('r'),
                            innerR: interpolate('innerR'),
                            start: interpolate('start'),
                            end: interpolate('end')
                        }));
                    }
                };
            }
            animation = anim; // Only when duration (#5572)
        }
        return SVGElement.prototype.animate.call(
            this,
            params,
            animation,
            complete
        );
    };

    // destroy all children
    wrapper.destroy = function (this: Highcharts.SVGElement): undefined {
        this.top.destroy();
        this.out.destroy();
        this.inn.destroy();
        this.side1.destroy();
        this.side2.destroy();

        return SVGElement.prototype.destroy.call(this);
    };
    // hide all children
    wrapper.hide = function (this: Highcharts.SVGElement): void {
        this.top.hide();
        this.out.hide();
        this.inn.hide();
        this.side1.hide();
        this.side2.hide();
    } as any;
    wrapper.show = function (
        this: Highcharts.SVGElement,
        inherit?: boolean
    ): void {
        this.top.show(inherit);
        this.out.show(inherit);
        this.inn.show(inherit);
        this.side1.show(inherit);
        this.side2.show(inherit);
    } as any;
    return wrapper;
};

// Generate the paths required to draw a 3D arc
SVGRenderer.prototype.arc3dPath = function (
    shapeArgs: Highcharts.SVGAttributes
): Highcharts.Arc3dPaths {
    var cx = shapeArgs.x, // x coordinate of the center
        cy = shapeArgs.y, // y coordinate of the center
        start = shapeArgs.start, // start angle
        end = shapeArgs.end - 0.00001, // end angle
        r = shapeArgs.r, // radius
        ir = shapeArgs.innerR || 0, // inner radius
        d = shapeArgs.depth || 0, // depth
        alpha = shapeArgs.alpha, // alpha rotation of the chart
        beta = shapeArgs.beta; // beta rotation of the chart

    // Derived Variables
    var cs = Math.cos(start), // cosinus of the start angle
        ss = Math.sin(start), // sinus of the start angle
        ce = Math.cos(end), // cosinus of the end angle
        se = Math.sin(end), // sinus of the end angle
        rx = r * Math.cos(beta), // x-radius
        ry = r * Math.cos(alpha), // y-radius
        irx = ir * Math.cos(beta), // x-radius (inner)
        iry = ir * Math.cos(alpha), // y-radius (inner)
        dx = d * Math.sin(beta), // distance between top and bottom in x
        dy = d * Math.sin(alpha); // distance between top and bottom in y

    // TOP
    var top: Highcharts.SVGPathArray = ['M', cx + (rx * cs), cy + (ry * ss)];

    top = top.concat(curveTo(cx, cy, rx, ry, start, end, 0, 0));
    top = top.concat([
        'L', cx + (irx * ce), cy + (iry * se)
    ]);
    top = top.concat(curveTo(cx, cy, irx, iry, end, start, 0, 0));
    top = top.concat(['Z']);

    // OUTSIDE
    var b = (beta > 0 ? Math.PI / 2 : 0),
        a = (alpha > 0 ? 0 : Math.PI / 2);

    var start2 = start > -b ? start : (end > -b ? -b : start),
        end2 = end < PI - a ? end : (start < PI - a ? PI - a : end),
        midEnd = 2 * PI - a;

    // When slice goes over bottom middle, need to add both, left and right
    // outer side. Additionally, when we cross right hand edge, create sharp
    // edge. Outer shape/wall:
    //
    //            -------
    //          /    ^    \
    //    4)   /   /   \   \  1)
    //        /   /     \   \
    //       /   /       \   \
    // (c)=> ====         ==== <=(d)
    //       \   \       /   /
    //        \   \<=(a)/   /
    //         \   \   /   / <=(b)
    //    3)    \    v    /  2)
    //            -------
    //
    // (a) - inner side
    // (b) - outer side
    // (c) - left edge (sharp)
    // (d) - right edge (sharp)
    // 1..n - rendering order for startAngle = 0, when set to e.g 90, order
    // changes clockwise (1->2, 2->3, n->1) and counterclockwise for negative
    // startAngle

    var out: Highcharts.SVGPathArray =
        ['M', cx + (rx * cos(start2)), cy + (ry * sin(start2))];

    out = out.concat(curveTo(cx, cy, rx, ry, start2, end2, 0, 0));

    // When shape is wide, it can cross both, (c) and (d) edges, when using
    // startAngle
    if (end > midEnd && start < midEnd) {
        // Go to outer side
        out = out.concat([
            'L', cx + (rx * cos(end2)) + dx, cy + (ry * sin(end2)) + dy
        ]);
        // Curve to the right edge of the slice (d)
        out = out.concat(curveTo(cx, cy, rx, ry, end2, midEnd, dx, dy));
        // Go to the inner side
        out = out.concat([
            'L', cx + (rx * cos(midEnd)), cy + (ry * sin(midEnd))
        ]);
        // Curve to the true end of the slice
        out = out.concat(curveTo(cx, cy, rx, ry, midEnd, end, 0, 0));
        // Go to the outer side
        out = out.concat([
            'L', cx + (rx * cos(end)) + dx, cy + (ry * sin(end)) + dy
        ]);
        // Go back to middle (d)
        out = out.concat(curveTo(cx, cy, rx, ry, end, midEnd, dx, dy));
        out = out.concat([
            'L', cx + (rx * cos(midEnd)), cy + (ry * sin(midEnd))
        ]);
        // Go back to the left edge
        out = out.concat(curveTo(cx, cy, rx, ry, midEnd, end2, 0, 0));

    // But shape can cross also only (c) edge:
    } else if (end > PI - a && start < PI - a) {
        // Go to outer side
        out = out.concat([
            'L',
            cx + (rx * Math.cos(end2)) + dx,
            cy + (ry * Math.sin(end2)) + dy
        ]);
        // Curve to the true end of the slice
        out = out.concat(curveTo(cx, cy, rx, ry, end2, end, dx, dy));
        // Go to the inner side
        out = out.concat([
            'L', cx + (rx * Math.cos(end)), cy + (ry * Math.sin(end))
        ]);
        // Go back to the artifical end2
        out = out.concat(curveTo(cx, cy, rx, ry, end, end2, 0, 0));
    }

    out = out.concat([
        'L', cx + (rx * Math.cos(end2)) + dx, cy + (ry * Math.sin(end2)) + dy
    ]);
    out = out.concat(curveTo(cx, cy, rx, ry, end2, start2, dx, dy));
    out = out.concat(['Z']);

    // INSIDE
    var inn: Highcharts.SVGPathArray = ['M', cx + (irx * cs), cy + (iry * ss)];

    inn = inn.concat(curveTo(cx, cy, irx, iry, start, end, 0, 0));
    inn = inn.concat([
        'L', cx + (irx * Math.cos(end)) + dx, cy + (iry * Math.sin(end)) + dy
    ]);
    inn = inn.concat(curveTo(cx, cy, irx, iry, end, start, dx, dy));
    inn = inn.concat(['Z']);

    // SIDES
    var side1: Highcharts.SVGPathArray = [
        'M', cx + (rx * cs), cy + (ry * ss),
        'L', cx + (rx * cs) + dx, cy + (ry * ss) + dy,
        'L', cx + (irx * cs) + dx, cy + (iry * ss) + dy,
        'L', cx + (irx * cs), cy + (iry * ss),
        'Z'
    ];
    var side2: Highcharts.SVGPathArray = [
        'M', cx + (rx * ce), cy + (ry * se),
        'L', cx + (rx * ce) + dx, cy + (ry * se) + dy,
        'L', cx + (irx * ce) + dx, cy + (iry * se) + dy,
        'L', cx + (irx * ce), cy + (iry * se),
        'Z'
    ];

    // correction for changed position of vanishing point caused by alpha and
    // beta rotations
    var angleCorr = Math.atan2(dy, -dx),
        angleEnd = Math.abs(end + angleCorr),
        angleStart = Math.abs(start + angleCorr),
        angleMid = Math.abs((start + end) / 2 + angleCorr);

    /**
     * set to 0-PI range
     * @private
     */
    function toZeroPIRange(angle: number): number {
        angle = angle % (2 * Math.PI);
        if (angle > Math.PI) {
            angle = 2 * Math.PI - angle;
        }
        return angle;
    }
    angleEnd = toZeroPIRange(angleEnd);
    angleStart = toZeroPIRange(angleStart);
    angleMid = toZeroPIRange(angleMid);

    // *1e5 is to compensate pInt in zIndexSetter
    var incPrecision = 1e5,
        a1 = angleMid * incPrecision,
        a2 = angleStart * incPrecision,
        a3 = angleEnd * incPrecision;

    return {
        top: top,
        // max angle is PI, so this is always higher
        zTop: Math.PI * incPrecision + 1,
        out: out,
        zOut: Math.max(a1, a2, a3),
        inn: inn,
        zInn: Math.max(a1, a2, a3),
        side1: side1,
        zSide1: a3 * 0.99, // to keep below zOut and zInn in case of same values
        side2: side2,
        zSide2: a2 * 0.99
    };
};
