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

        class DEMAIndicator extends EMAIndicator {
            public data: Array<DEMAIndicatorPoint>;
            public getEMA(
                yVal: (Array<number>|Array<Array<number>>),
                prevEMA: (number|undefined),
                SMA: number,
                index?: number,
                i?: number,
                xVal?: Array<number>
            ): [number, number];
            public getValues(
                series: DEMAIndicatorLinkedParentSeries,
                params: DEMAIndicatorParamsOptions
            ): (boolean|IndicatorValuesObject);
            public init(): void;
            public options: DEMAIndicatorOptions;
            public pointClass: typeof DEMAIndicatorPoint;
            public points: Array<DEMAIndicatorPoint>;
        }

        interface DEMAIndicatorLinkedParentSeries extends Series {
            EMApercent: number;
            xData: Array<number>;
            yData: Array<Array<number>>;
        }

        interface DEMAIndicatorParamsOptions extends EMAIndicatorParamsOptions {
            // for inheritance.
        }

        class DEMAIndicatorPoint extends EMAIndicatorPoint {
            public series: DEMAIndicator;
        }

        interface DEMAIndicatorOptions extends EMAIndicatorOptions {
            params?: DEMAIndicatorParamsOptions;
        }

        interface SeriesTypesDictionary {
            dema: typeof DEMAIndicator;
        }
    }
}

import U from '../parts/Utilities.js';
var isArray = U.isArray;

import requiredIndicatorMixin from '../mixins/indicator-required.js';

var EMAindicator = H.seriesTypes.ema,
    requiredIndicator = requiredIndicatorMixin,
    correctFloat = H.correctFloat;

/**
 * The DEMA series Type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.dema
 *
 * @augments Highcharts.Series
 */
H.seriesType<Highcharts.DEMAIndicator>(
    'dema',
    'ema',
    /**
     * Double exponential moving average (DEMA) indicator. This series requires
     * `linkedTo` option to be set and should be loaded after the
     * `stock/indicators/indicators.js` and `stock/indicators/ema.js`.
     *
     * @sample {highstock} stock/indicators/dema
     *         DEMA indicator
     *
     * @extends      plotOptions.ema
     * @since        7.0.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, compare, compareBase, joinBy, keys,
     *               navigatorOptions, pointInterval, pointIntervalUnit,
     *               pointPlacement, pointRange, pointStart, showInNavigator,
     *               stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/ema
     * @requires     stock/indicators/dema
     * @optionparent plotOptions.dema
     */
    {},
    /**
     * @lends Highcharts.Series#
     */
    {
        init: function (this: Highcharts.DEMAIndicator): void {
            var args = arguments,
                ctx = this;

            requiredIndicator.isParentLoaded(
                (EMAindicator as any),
                'ema',
                ctx.type,
                function (indicator: Highcharts.Indicator): undefined {
                    indicator.prototype.init.apply(ctx, args);
                    return;
                }
            );
        },
        getEMA: function (
            this: Highcharts.DEMAIndicator,
            yVal: (Array<number>|Array<Array<number>>),
            prevEMA: (number|undefined),
            SMA: number,
            index?: number,
            i?: number,
            xVal?: Array<number>
        ): [number, number] {

            return EMAindicator.prototype.calculateEma(
                xVal || [],
                yVal,
                i === undefined ? 1 : i,
                (this.chart.series[0] as any).EMApercent,
                prevEMA,
                index === undefined ? -1 : index,
                SMA
            );
        },

        getValues: function (
            this: Highcharts.DEMAIndicator,
            series: Highcharts.DEMAIndicatorLinkedParentSeries,
            params: Highcharts.DEMAIndicatorParamsOptions
        ): (boolean|Highcharts.IndicatorValuesObject) {
            var period: number = (params.period as any),
                doubledPeriod: number = 2 * period,
                xVal: Array<number> = series.xData,
                yVal: Array<Array<number>> = series.yData,
                yValLen: number = yVal ? yVal.length : 0,
                index = -1,
                accumulatePeriodPoints = 0,
                SMA = 0,
                DEMA: Array<Array<number>> = [],
                xDataDema: Array<number> = [],
                yDataDema: Array<number> = [],
                EMA = 0,
                // EMA(EMA)
                EMAlevel2: number,
                // EMA of previous point
                prevEMA: (number|undefined),
                prevEMAlevel2: (number|undefined),
                // EMA values array
                EMAvalues: Array<number> = [],
                i: number,
                DEMAPoint: [number, number];

            series.EMApercent = (2 / (period + 1));

            // Check period, if bigger than EMA points length, skip
            if (yValLen < 2 * period - 1) {
                return false;
            }

            // Switch index for OHLC / Candlestick / Arearange
            if (isArray(yVal[0])) {
                index = params.index ? params.index : 0;
            }

            // Accumulate first N-points
            accumulatePeriodPoints =
                EMAindicator.prototype.accumulatePeriodPoints(
                    period,
                    index,
                    yVal
                );

            // first point
            SMA = accumulatePeriodPoints / period;
            accumulatePeriodPoints = 0;

            // Calculate value one-by-one for each period in visible data
            for (i = period; i < yValLen + 2; i++) {
                if (i < yValLen + 1) {
                    EMA = this.getEMA(
                        yVal,
                        prevEMA,
                        SMA,
                        index,
                        i
                    )[1];
                    EMAvalues.push(EMA);
                }
                prevEMA = EMA;

                // Summing first period points for EMA(EMA)
                if (i < doubledPeriod) {
                    accumulatePeriodPoints += EMA;
                } else {
                    // Calculate DEMA
                    // First DEMA point
                    if (i === doubledPeriod) {
                        SMA = accumulatePeriodPoints / period;
                    }
                    EMA = EMAvalues[i - period - 1];
                    EMAlevel2 = this.getEMA(
                        [EMA],
                        prevEMAlevel2,
                        SMA
                    )[1];
                    DEMAPoint = [
                        xVal[i - 2],
                        correctFloat(2 * EMA - EMAlevel2)
                    ];
                    DEMA.push(DEMAPoint);
                    xDataDema.push(DEMAPoint[0]);
                    yDataDema.push(DEMAPoint[1]);
                    prevEMAlevel2 = EMAlevel2;
                }
            }

            return {
                values: DEMA,
                xData: xDataDema,
                yData: yDataDema
            };
        }
    }
);

/**
 * A `DEMA` series. If the [type](#series.ema.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.ema
 * @since     7.0.0
 * @product   highstock
 * @excluding allAreas, colorAxis, compare, compareBase, dataParser, dataURL,
 *            joinBy, keys, navigatorOptions, pointInterval, pointIntervalUnit,
 *            pointPlacement, pointRange, pointStart, showInNavigator, stacking
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/ema
 * @requires  stock/indicators/dema
 * @apioption series.dema
 */

''; // adds doclet above to the transpiled file
