/* *
 *
 *  Highcharts variwide module
 *
 *  (c) 2010-2019 Torstein Honsi
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
        class VariwidePoint extends ColumnPoint {
            public crosshairWidth: number;
            public options: VariwidePointOptions;
            public series: VariwideSeries;
            public isValid(): boolean;
        }
        class VariwideSeries extends ColumnSeries {
            public data: Array<VariwidePoint>;
            public irregularWidths: boolean;
            public options: VariwideSeriesOptions;
            public parallelArrays: Array<string>;
            public pointArrayMap: Array<string>;
            public pointClass: typeof VariwidePoint;
            public points: Array<VariwidePoint>;
            public relZ: Array<number>;
            public totalZ: number;
            public zData?: Array<number>;
            public correctStackLabels(): void;
            public postTranslate(
                index: number,
                x: number,
                point?: VariwidePoint
            ): number;
            public processData(force?: boolean): undefined;
            public translate(): void;
        }
        interface Axis {
            variwide?: boolean;
            zData?: Array<number>;
        }
        interface Point {
            crosshairWidth?: VariwidePoint['crosshairWidth'];
        }
        interface SeriesTypesDictionary {
            variwide: typeof VariwideSeries;
        }
        interface Tick {
            postTranslate(
                xy: PositionObject,
                xOrY: keyof PositionObject,
                index: number
            ): void;
        }
        interface VariwidePointOptions extends ColumnPointOptions {
        }
        interface VariwideSeriesOptions extends ColumnSeriesOptions {
            states?: SeriesStatesOptionsObject<VariwideSeries>;
        }
    }
}

import U from '../parts/Utilities.js';
const {
    isNumber,
    pick
} = U;

import '../parts/AreaSeries.js';

var addEvent = H.addEvent,
    seriesType = H.seriesType,
    seriesTypes = H.seriesTypes;

/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.variwide
 *
 * @augments Highcharts.Series
 */
seriesType<Highcharts.VariwideSeries>('variwide', 'column'

    /**
     * A variwide chart (related to marimekko chart) is a column chart with a
     * variable width expressing a third dimension.
     *
     * @sample {highcharts} highcharts/demo/variwide/
     *         Variwide chart
     * @sample {highcharts} highcharts/series-variwide/inverted/
     *         Inverted variwide chart
     * @sample {highcharts} highcharts/series-variwide/datetime/
     *         Variwide columns on a datetime axis
     *
     * @extends      plotOptions.column
     * @since        6.0.0
     * @product      highcharts
     * @excluding    boostThreshold, crisp, depth, edgeColor, edgeWidth,
     *               groupZPadding
     * @requires     modules/variwide
     * @optionparent plotOptions.variwide
     */
    , {
        /**
         * In a variwide chart, the point padding is 0 in order to express the
         * horizontal stacking of items.
         */
        pointPadding: 0,
        /**
         * In a variwide chart, the group padding is 0 in order to express the
         * horizontal stacking of items.
         */
        groupPadding: 0
    }, {
        irregularWidths: true,
        pointArrayMap: ['y', 'z'],
        parallelArrays: ['x', 'y', 'z'],
        processData: function (
            this: Highcharts.VariwideSeries,
            force?: boolean
        ): undefined {
            this.totalZ = 0;
            this.relZ = [];
            seriesTypes.column.prototype.processData.call(this, force);

            (this.xAxis.reversed ?
                (this.zData as any).slice().reverse() :
                (this.zData as any)
            ).forEach(
                function (
                    this: Highcharts.VariwideSeries,
                    z: number,
                    i: number
                ): void {
                    this.relZ[i] = this.totalZ;
                    this.totalZ += z;
                },
                this
            );

            if (this.xAxis.categories) {
                this.xAxis.variwide = true;
                this.xAxis.zData = this.zData; // Used for label rank
            }
            return;
        },

        /* eslint-disable valid-jsdoc */

        /**
         * Translate an x value inside a given category index into the distorted
         * axis translation.
         *
         * @private
         * @function Highcharts.Series#postTranslate
         *
         * @param {number} index
         *        The category index
         *
         * @param {number} x
         *        The X pixel position in undistorted axis pixels
         *
         * @param {Highcharts.Point} point
         *        For crosshairWidth for every point
         *
         * @return {number}
         *         Distorted X position
         */
        postTranslate: function (
            this: Highcharts.VariwideSeries,
            index: number,
            x: number,
            point?: Highcharts.VariwidePoint
        ): number {

            var axis = this.xAxis,
                relZ = this.relZ,
                i = axis.reversed ? relZ.length - index : index,
                goRight = axis.reversed ? -1 : 1,
                len = axis.len,
                totalZ = this.totalZ,
                linearSlotLeft = i / relZ.length * len,
                linearSlotRight = (i + goRight) / relZ.length * len,
                slotLeft = (pick(relZ[i], totalZ) / totalZ) * len,
                slotRight = (pick(relZ[i + goRight], totalZ) / totalZ) * len,
                xInsideLinearSlot = x - linearSlotLeft,
                ret;

            // Set crosshairWidth for every point (#8173)
            if (point) {
                point.crosshairWidth = slotRight - slotLeft;
            }

            ret = slotLeft +
            xInsideLinearSlot * (slotRight - slotLeft) /
            (linearSlotRight - linearSlotLeft);

            return ret;
        },

        /* eslint-enable valid-jsdoc */

        // Extend translation by distoring X position based on Z.
        translate: function (this: Highcharts.VariwideSeries): void {

            // Temporarily disable crisping when computing original shapeArgs
            var crispOption = this.options.crisp,
                xAxis = this.xAxis;

            this.options.crisp = false;

            seriesTypes.column.prototype.translate.call(this);

            // Reset option
            this.options.crisp = crispOption;

            var inverted = this.chart.inverted,
                crisp = this.borderWidth % 2 / 2;

            // Distort the points to reflect z dimension
            this.points.forEach(function (
                point: Highcharts.VariwidePoint,
                i: number
            ): void {
                var left: number, right: number;

                if (xAxis.variwide) {
                    left = this.postTranslate(
                        i,
                        (point.shapeArgs as any).x,
                        point
                    );

                    right = this.postTranslate(
                        i,
                        (point.shapeArgs as any).x +
                        (point.shapeArgs as any).width
                    );

                    // For linear or datetime axes, the variwide column should
                    // start with X and extend Z units, without modifying the
                    // axis.
                } else {
                    left = point.plotX as any;
                    right = xAxis.translate(
                        (point.x as any) + (point.z as any),
                        0 as any,
                        0 as any,
                        0 as any,
                        1 as any
                    ) as any;
                }

                if (this.options.crisp) {
                    left = Math.round(left) - crisp;
                    right = Math.round(right) - crisp;
                }

                (point.shapeArgs as any).x = left;
                (point.shapeArgs as any).width = Math.max(right - left, 1);

                // Crosshair position (#8083)
                point.plotX = (left + right) / 2;

                // Adjust the tooltip position
                if (!inverted) {
                    (point.tooltipPos as any)[0] =
                        (point.shapeArgs as any).x +
                        (point.shapeArgs as any).width / 2;
                } else {
                    (point.tooltipPos as any)[1] =
                        xAxis.len - (point.shapeArgs as any).x -
                        (point.shapeArgs as any).width / 2;
                }
            }, this);

            if (this.options.stacking) {
                this.correctStackLabels();
            }
        },

        // Function that corrects stack labels positions
        correctStackLabels: function (this: Highcharts.VariwideSeries): void {
            var series = this,
                options = series.options,
                yAxis = series.yAxis,
                pointStack,
                pointWidth,
                stack,
                xValue;

            series.points.forEach(function (
                point: Highcharts.VariwidePoint
            ): void {
                xValue = point.x;
                pointWidth = (point.shapeArgs as any).width;
                stack = yAxis.stacks[(
                    series.negStacks &&
                    (point.y as any) < (
                        options.startFromThreshold ?
                            0 :
                            (options.threshold as any)
                    ) ?
                        '-' :
                        ''
                ) + series.stackKey];
                pointStack = stack[xValue as any];

                if (stack && pointStack && !point.isNull) {
                    pointStack.setOffset(
                        -(pointWidth / 2) || 0,
                        pointWidth || 0,
                        undefined,
                        undefined,
                        point.plotX
                    );
                }
            });
        }

        // Point functions
    }, {
        isValid: function (this: Highcharts.VariwidePoint): boolean {
            return isNumber(this.y) && isNumber(this.z);
        }
    });

H.Tick.prototype.postTranslate = function (
    xy: Highcharts.PositionObject,
    xOrY: keyof Highcharts.PositionObject,
    index: number
): void {
    var axis = this.axis,
        pos = xy[xOrY] - axis.pos;

    if (!axis.horiz) {
        pos = axis.len - pos;
    }
    pos = (axis.series[0] as any).postTranslate(index, pos);

    if (!axis.horiz) {
        pos = axis.len - pos;
    }
    xy[xOrY] = axis.pos + pos;
};

/* eslint-disable no-invalid-this */

// Same width as the category (#8083)
addEvent(H.Axis, 'afterDrawCrosshair', function (
    e: {
        point: Highcharts.VariwidePoint;
    }
): void {
    if (this.variwide && this.cross) {
        this.cross.attr(
            'stroke-width',
            (e.point && e.point.crosshairWidth) as any
        );
    }
});

// On a vertical axis, apply anti-collision logic to the labels.
addEvent(H.Axis, 'afterRender', function (): void {
    var axis = this;

    if (!this.horiz && this.variwide) {
        this.chart.labelCollectors.push(
            function (): Array<Highcharts.SVGElement> {
                return axis.tickPositions
                    .filter(function (pos: number): boolean {
                        return axis.ticks[pos].label as any;
                    })
                    .map(function (
                        pos: number,
                        i: number
                    ): Highcharts.SVGElement {
                        var label: Highcharts.SVGElement =
                            axis.ticks[pos].label as any;

                        label.labelrank = (axis.zData as any)[i];
                        return label;
                    });
            }
        );
    }
});

addEvent(H.Tick, 'afterGetPosition', function (
    e: {
        pos: Highcharts.PositionObject;
        xOrY: keyof Highcharts.PositionObject;
    }
): void {
    var axis = this.axis,
        xOrY: keyof Highcharts.PositionObject = axis.horiz ? 'x' : 'y';

    if (axis.variwide) {
        (this as any)[xOrY + 'Orig'] = e.pos[xOrY];
        this.postTranslate(e.pos, xOrY, this.pos);
    }
});

H.wrap(H.Tick.prototype, 'getLabelPosition', function (
    this: Highcharts.Tick,
    proceed: Function,
    x: number,
    y: number,
    label: Highcharts.SVGElement,
    horiz: boolean,
    labelOptions: Highcharts.DataLabelsOptionsObject,
    tickmarkOffset: number,
    index: number
): Highcharts.PositionObject {
    var args = Array.prototype.slice.call(arguments, 1),
        xy: Highcharts.PositionObject,
        xOrY: keyof Highcharts.PositionObject = horiz ? 'x' : 'y';

    // Replace the x with the original x
    if (
        this.axis.variwide &&
        typeof (this as any)[xOrY + 'Orig'] === 'number'
    ) {
        args[horiz ? 0 : 1] = (this as any)[xOrY + 'Orig'];
    }

    xy = proceed.apply(this, args);

    // Post-translate
    if (this.axis.variwide && this.axis.categories) {
        this.postTranslate(xy, xOrY, index);
    }
    return xy;
});


/**
 * A `variwide` series. If the [type](#series.variwide.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.variwide
 * @product   highcharts
 * @requires  modules/variwide
 * @apioption series.variwide
 */

/**
 * An array of data points for the series. For the `variwide` series type,
 * points can be given in the following ways:
 *
 * 1. An array of arrays with 3 or 2 values. In this case, the values correspond
 *    to `x,y,z`. If the first value is a string, it is applied as the name of
 *    the point, and the `x` value is inferred. The `x` value can also be
 *    omitted, in which case the inner arrays should be of length 2. Then the
 *    `x` value is automatically calculated, either starting at 0 and
 *    incremented by 1, or from `pointStart` and `pointInterval` given in the
 *    series options.
 *    ```js
 *       data: [
 *           [0, 1, 2],
 *           [1, 5, 5],
 *           [2, 0, 2]
 *       ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.variwide.turboThreshold), this option is not
 *    available.
 *    ```js
 *       data: [{
 *           x: 1,
 *           y: 1,
 *           z: 1,
 *           name: "Point2",
 *           color: "#00FF00"
 *       }, {
 *           x: 1,
 *           y: 5,
 *           z: 4,
 *           name: "Point1",
 *           color: "#FF00FF"
 *       }]
 *    ```
 *
 * @sample {highcharts} highcharts/series/data-array-of-arrays/
 *         Arrays of numeric x and y
 * @sample {highcharts} highcharts/series/data-array-of-arrays-datetime/
 *         Arrays of datetime x and y
 * @sample {highcharts} highcharts/series/data-array-of-name-value/
 *         Arrays of point.name and y
 * @sample {highcharts} highcharts/series/data-array-of-objects/
 *         Config objects
 *
 * @type      {Array<Array<(number|string),number>|Array<(number|string),number,number>|*>}
 * @extends   series.line.data
 * @excluding marker
 * @product   highcharts
 * @apioption series.variwide.data
 */

/**
 * The relative width for each column. On a category axis, the widths are
 * distributed so they sum up to the X axis length. On linear and datetime axes,
 * the columns will be laid out from the X value and Z units along the axis.
 *
 * @type      {number}
 * @product   highcharts
 * @apioption series.variwide.data.z
 */

''; // adds doclets above to transpiled file
