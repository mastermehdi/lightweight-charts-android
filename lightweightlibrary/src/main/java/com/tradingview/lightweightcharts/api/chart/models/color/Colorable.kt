package com.tradingview.lightweightcharts.api.chart.models.color

import android.graphics.Color
import com.google.gson.*
import com.tradingview.lightweightcharts.api.series.exception.ColorParseException
import com.tradingview.lightweightcharts.help.isString
import java.lang.reflect.Type
import kotlin.contracts.ExperimentalContracts
import java.lang.IllegalStateException

interface Colorable {
    class ColorAdapter : JsonSerializer<Colorable>, JsonDeserializer<Colorable> {
        override fun serialize(
            src: Colorable?,
            typeOfSrc: Type?,
            context: JsonSerializationContext?
        ): JsonElement {
            return when (src) {
                is IntColor -> JsonPrimitive(src.value.toHexString())
                is NoColor -> JsonPrimitive("")
                else -> throw IllegalStateException("Unknown type of color: $typeOfSrc")
            }
        }

        @ExperimentalContracts
        override fun deserialize(
            json: JsonElement?,
            typeOfT: Type?,
            context: JsonDeserializationContext?
        ): Colorable? {
            return when {
                json.isString() && json.asString.isBlank() -> NoColor
                json.isString() -> json.asString.toColor()?.let { IntColor(it) }
                else -> null
            }
        }
    }
}

internal fun Int.toHexString(): String {
    val alpha = String.format("%02x", Color.alpha(this))
    val red = String.format("%02x", Color.red(this))
    val green = String.format("%02x", Color.green(this))
    val blue = String.format("%02x", Color.blue(this))
    return "#$red$green$blue$alpha"
}

internal fun String.toColor(): Int? {
    return when {
        isBlank() -> null
        get(0) == '#' -> parseHexColor()
        count() > 6 && subSequence(0, 4) == "rgba" -> parseRgbaColor()
        else -> throw ColorParseException("Unknown color")
    }
}

private fun String.parseHexColor(): Int {
    val argbAlphaMask = 0x00000000ff000000L
    val rgbaAlphaMask = 0x00000000000000ffL

    // Use a long to avoid rollovers on #ffXXXXXX
    val color: Long = substring(1).toLong(16)

    val argbColor = when (length) {
        7 -> color or argbAlphaMask
        9 -> {
            val sRGBColor = color shr 8 //remove alpha
            val alpha = (color and rgbaAlphaMask) shl 24
            sRGBColor or alpha
        }
        else -> throw ColorParseException("Unknown color")
    }
    return argbColor.toInt()
}

private fun String.parseRgbaColor(): Int {
    val regex = "rgba[(]\\s*(\\d+)\\s*[,]\\s*(\\d+)\\s*[,]\\s*(\\d+)\\s*[,]\\s*([\\d.]+)\\s*[)]".toRegex()
    return regex.matchEntire(this)?.groupValues?.let { groups ->
        val red = groups[1].toInt()
        val green = groups[2].toInt()
        val blue = groups[3].toInt()
        val alpha = (groups[4].toFloat() * 255).toInt()
        return@let Color.argb(alpha, red, green, blue)
    } ?: throw ColorParseException("Unknown color")
}