import SeriesFunctionManager from "./series-function-manager.js";
import SubscriptionsFunctionManager from "./subscriptions-function-manager";
import PriceScaleFunctionManager from "./price-scale-function-manager";
import TimeScaleFunctionManager from "./time-scale-function-manager";
import { logger } from './logger.js';

export default class ChartRegistrationFunctionsController {

  constructor(chart, functionManager, pluginManager) {
        this.chart = chart
        this.functionManager = functionManager
        this.pluginManager = pluginManager
        this.cache = new Map()
    }

    registerFunctions() {

        const series = new SeriesFunctionManager(this.chart, this.functionManager, this.pluginManager)
        series.register()

        const subscriptions = new SubscriptionsFunctionManager(
            this.chart,
            this.functionManager,
            (seriesObject, params) => { return series.getSeriesId(seriesObject, params) }
        )
        subscriptions.register()

        const timeScale = new TimeScaleFunctionManager(this.chart, this.functionManager, this.pluginManager)
        timeScale.register()

        const priceScale = new PriceScaleFunctionManager(this.chart, this.functionManager)
        priceScale.register()

        this.functionManager.registerFunction("remove", (params, resolve) => {
            this.cache.clear()
            this.chart.remove()
        })

        this.functionManager.registerFunction("chartOptions", (params, resolve) => {
            let options = this.chart.options()

            if (options.localization && options.localization.priceFormatter) {
                const fun = options.localization.priceFormatter
                options.localization.priceFormatter = this.pluginManager.getPlugin(fun)
            }

            if (options.localization && options.localization.timeFormatter) {
                const fun = options.localization.timeFormatter
                options.localization.timeFormatter = this.pluginManager.getPlugin(fun)
            }

            if (options.timeScale && options.timeScale.tickMarkFormatter) {
                const fun = options.timeScale.tickMarkFormatter
                options.timeScale.tickMarkFormatter = this.pluginManager.getPlugin(fun)
            }

            resolve(options)
        })
        this.functionManager.registerFunction("chartApplyOptions", (input, resolve) => {
            new Promise((resolve) => {
                if (!input.params.options.localization || !input.params.options.localization.priceFormatter) {
                    resolve()
                    return
                }

                const plugin = input.params.options.localization.priceFormatter
                this.pluginManager.register(plugin, (fun) => {
                    input.params.options.localization.priceFormatter = fun
                    logger.d('plugin priceFormatter registered')
                    resolve()
                })
            }).then(() => new Promise((resolve) => {
                if (!input.params.options.localization || !input.params.options.localization.timeFormatter) {
                    resolve()
                    return
                }

                const plugin = input.params.options.localization.timeFormatter
                this.pluginManager.register(plugin, (fun) => {
                    input.params.options.localization.timeFormatter = fun
                    logger.d('plugin timeFormatter registered')
                    resolve()
                })
            })).then(() => new Promise((resolve) => {
                if (!input.params.options.timeScale || !input.params.options.timeScale.tickMarkFormatter) {
                    resolve()
                    return
                }

                const plugin = input.params.options.timeScale.tickMarkFormatter
                this.pluginManager.register(plugin, (fun) => {
                    input.params.options.timeScale.tickMarkFormatter = fun
                    logger.d('plugin tickMarkFormatter registered')
                    resolve()
                })
            })).then(() => {
                this.chart.applyOptions(input.params.options)
                logger.d('apply options')
            })
        })

        this.functionManager.registerFunction("takeScreenshot", (input, resolve) => {
            const mimeType = input.params.mimeType
            let chartScreenshot = this.chart.takeScreenshot()
            resolve(chartScreenshot.toDataURL(mimeType, 1.0))
        })

    }

}
