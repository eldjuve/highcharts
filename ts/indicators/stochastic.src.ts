/* *
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
        class StochasticIndicator
            extends SMAIndicator implements MultipleLinesIndicator {
            public data: Array<StochasticIndicatorPoint>;
            public getTranslatedLinesNames: MultipleLinesMixin[
                'getTranslatedLinesNames'
            ];
            public getValues(
                series: Series,
                params: StochasticIndicatorParamsOptions
            ): (boolean|IndicatorMultipleNullableValuesObject);
            public init(): void;
            public linesApiNames: Array<string>;
            public nameBase: string;
            public nameComponents: Array<string>;
            public options: StochasticIndicatorOptions;
            public parallelArrays: Array<string>;
            public pointArrayMap: Array<string>;
            public pointClass: typeof StochasticIndicatorPoint;
            public points: Array<StochasticIndicatorPoint>;
            public pointValKey: string;
        }

        interface StochasticIndicatorParamsOptions
            extends SMAIndicatorParamsOptions {
            periods?: [number, number];
        }

        class StochasticIndicatorPoint extends SMAIndicatorPoint {
            public series: StochasticIndicator;
        }

        interface StochasticIndicatorOptions
            extends SMAIndicatorOptions, MultipleLinesIndicatorOptions {
            dataGrouping?: DataGroupingOptionsObject;
            marker?: PointMarkerOptionsObject;
            params?: StochasticIndicatorParamsOptions;
            smoothedLine?: Dictionary<CSSObject>;
            tooltip?: TooltipOptions;
        }

        interface SeriesTypesDictionary {
            stochastic: typeof StochasticIndicator;
        }
    }
}

import U from '../parts/Utilities.js';
var isArray = U.isArray;

import reduceArrayMixin from '../mixins/reduce-array.js';
import multipleLinesMixin from '../mixins/multipe-lines.js';

var merge = H.merge,
    SMA = H.seriesTypes.sma,
    getArrayExtremes = reduceArrayMixin.getArrayExtremes;

/**
 * The Stochastic series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.stochastic
 *
 * @augments Highcharts.Series
 */
H.seriesType<Highcharts.StochasticIndicator>(
    'stochastic',
    'sma',
    /**
     * Stochastic oscillator. This series requires the `linkedTo` option to be
     * set and should be loaded after the `stock/indicators/indicators.js` file.
     *
     * @sample stock/indicators/stochastic
     *         Stochastic oscillator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, joinBy, keys, navigatorOptions,
     *               pointInterval, pointIntervalUnit, pointPlacement,
     *               pointRange, pointStart, showInNavigator, stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/stochastic
     * @optionparent plotOptions.stochastic
     */
    {
        /**
         * @excluding index, period
         */
        params: {
            /**
             * Periods for Stochastic oscillator: [%K, %D].
             *
             * @type    {Array<number,number>}
             * @default [14, 3]
             */
            periods: [14, 3]
        },
        marker: {
            enabled: false
        },
        tooltip: {
            pointFormat: '<span style="color:{point.color}">\u25CF</span><b> {series.name}</b><br/>%K: {point.y}<br/>%D: {point.smoothed}<br/>'
        },
        /**
         * Smoothed line options.
         */
        smoothedLine: {
            /**
             * Styles for a smoothed line.
             */
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line. If not set, it's inherited from
                 * [plotOptions.stochastic.color
                 * ](#plotOptions.stochastic.color).
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: undefined
            }
        },
        dataGrouping: {
            approximation: 'averages'
        }
    },
    /**
     * @lends Highcharts.Series#
     */
    H.merge(multipleLinesMixin, {
        nameComponents: ['periods'],
        nameBase: 'Stochastic',
        pointArrayMap: ['y', 'smoothed'],
        parallelArrays: ['x', 'y', 'smoothed'],
        pointValKey: 'y',
        linesApiNames: ['smoothedLine'],
        init: function (this: Highcharts.StochasticIndicator): void {
            SMA.prototype.init.apply(this, arguments);

            // Set default color for lines:
            this.options = merge({
                smoothedLine: {
                    styles: {
                        lineColor: this.color
                    }
                }
            }, this.options);
        },
        getValues: function (
            this: Highcharts.StochasticIndicator,
            series: Highcharts.Series,
            params: Highcharts.StochasticIndicatorParamsOptions
        ): (boolean|Highcharts.IndicatorMultipleNullableValuesObject) {
            var periodK: number = (params.periods as any)[0],
                periodD: number = (params.periods as any)[1],
                xVal: Array<number> = (series.xData as any),
                yVal: Array<Array<number>> = (series.yData as any),
                yValLen: number = yVal ? yVal.length : 0,
                // 0- date, 1-%K, 2-%D
                SO: Array<[number, number, (number|null)]> = [],
                xData: Array<number> = [],
                yData: Array<Array<(number|null)>> = [],
                slicedY: Array<Array<number>>,
                close = 3,
                low = 2,
                high = 1,
                CL: number,
                HL: number,
                LL: number,
                K: number,
                D: number|null = null,
                points: (boolean|Highcharts.IndicatorValuesObject|
                Highcharts.IndicatorNullableValuesObject|
                Highcharts.IndicatorUndefinableValuesObject|
                Highcharts.IndicatorMultipleValuesObject|
                Highcharts.IndicatorMultipleNullableValuesObject|
                Highcharts.IndicatorMultipleUndefinableValuesObject
                ),
                extremes: [number, number],
                i: number;


            // Stochastic requires close value
            if (
                yValLen < periodK ||
                !isArray(yVal[0]) ||
                yVal[0].length !== 4
            ) {
                return false;
            }

            // For a N-period, we start from N-1 point, to calculate Nth point
            // That is why we later need to comprehend slice() elements list
            // with (+1)
            for (i = periodK - 1; i < yValLen; i++) {
                slicedY = yVal.slice(i - periodK + 1, i + 1);

                // Calculate %K
                extremes = getArrayExtremes(slicedY, low, high);
                LL = extremes[0]; // Lowest low in %K periods
                CL = yVal[i][close] - LL;
                HL = extremes[1] - LL;
                K = CL / HL * 100;

                xData.push(xVal[i]);
                yData.push([K, null]);

                // Calculate smoothed %D, which is SMA of %K
                if (i >= (periodK - 1) + (periodD - 1)) {
                    points = SMA.prototype.getValues.call(this, ({
                        xData: xData.slice(-periodD),
                        yData: yData.slice(-periodD)
                    } as any), {
                        period: periodD
                    });
                    D = (points as any).yData[0];
                }

                SO.push([xVal[i], K, D]);
                yData[yData.length - 1][1] = D;
            }

            return {
                values: SO,
                xData: xData,
                yData: yData
            };
        }
    })
);

/**
 * A Stochastic indicator. If the [type](#series.stochastic.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.stochastic
 * @since     6.0.0
 * @product   highstock
 * @excluding allAreas, colorAxis,  dataParser, dataURL, joinBy, keys,
 *            navigatorOptions, pointInterval, pointIntervalUnit,
 *            pointPlacement, pointRange, pointStart, showInNavigator, stacking
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/stochastic
 * @apioption series.stochastic
 */

''; // to include the above in the js output
