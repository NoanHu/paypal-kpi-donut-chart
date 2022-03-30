import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { path } from 'd3-path'
import {VisualSettings} from "./settings";
import DataViewObjects = powerbi.DataViewObjects;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataViewObject = powerbi.DataViewObject;
import VisualEnumerationInstanceKinds = powerbi.VisualEnumerationInstanceKinds;
// powerbi.extensibility.utils.tooltip
import { createTooltipServiceWrapper, TooltipEventArgs, ITooltipServiceWrapper, TooltipEnabledDataPoint } from "powerbi-visuals-utils-tooltiputils/lib/index.js";


export function getValue<T>(objects: DataViewObjects, objectName: string, propertyName: string, defaultValue: T): T {
if (objects) {
  let object = objects[objectName];
  if (object) {
    let property: T = <T>object[propertyName];
    if (property !== undefined) {
      return property;
    }
  }
}

return defaultValue;
}

export function drawArc (context, x, y, radius, startAngle, endAngle) {
    context.arc(x, y, radius, startAngle, endAngle)
    return context
}

export function drawMain<T>(columnDisplayName: string, minLength: number, percent:number, forecolor:string, bgcolor:string, fontSize:number, fontWeight:string, fontColor:string, fontItalic: string, fontFamily: string, valueDecimalPlaces: number, outerLineWidth:number, innerLineWidth:number, amendmentSize:number) {
    const center_x = minLength / 2;
    const center_y = minLength / 2;
    const rad = Math.PI*2/100;
    const decimalPlaces = typeof valueDecimalPlaces === "string" ? 2 : valueDecimalPlaces

    function backgroundCircle(){
        const context = path();
        const radius = center_x - innerLineWidth - 10;
        drawArc(context, center_x, center_y, radius, 0, Math.PI*2)
        d3.select("#arc-container")
            .append("g")
            .classed("bg-circle", true)
            .append('path')
            .attr("d", context.toString())
            .attr("stroke", bgcolor)
            .attr("stroke-linecap", "round")
            .attr("stroke-width", innerLineWidth)
            .attr("fill", "none")
    }


    function foregroundCircle(n){
        const context = path();
        const radius = center_x - outerLineWidth + amendmentSize - 10;
        drawArc(context, center_x, center_y, radius , -1*Math.PI/2, -1*Math.PI/2 + n*rad);
        d3.select("#arc-container")
            .append("g")
            .classed("fore-circle", true)
            .data([{
                tooltipInfo: [{
                    displayName: columnDisplayName,
                    value: n.toFixed(decimalPlaces)+"%"
                }]
            }])
            .append('path')
            .attr("d", context.toString())
            .attr("stroke", forecolor)
            .attr("stroke-linecap", "round")
            .attr("stroke-width", outerLineWidth)
            .attr("fill", "none")
    }

    function text(n){
        const percent = n.toFixed(decimalPlaces)+"%"
        d3.select("#arc-container")
            .append("g")
            .append('text')
            .attr("id", "percent")
            .style("font", `${fontItalic} ${fontWeight} ${fontSize}px ${fontFamily}`)
            .style("fill", fontColor)
            .text(percent)
        const textElement = d3.select("#percent")
        const textWidth = textElement.node().getBBox().width
        const textHeight = textElement.node().getBBox().height
        textElement
            .attr("x", center_x - textWidth/2)
            .attr("y", center_y + textHeight/2 - 4)
    }
    backgroundCircle();
    foregroundCircle(percent);
    text(percent);
}

export class payPalKPIDonutChart implements IVisual {

    private rootElement: JQuery;
    private dataView: powerbi.DataView;
    private settings: VisualSettings;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    constructor(options: VisualConstructorOptions) {
        this.rootElement = $(options.element);
        this.tooltipServiceWrapper = createTooltipServiceWrapper(options.host.tooltipService, options.element);
    }
    public update(options: VisualUpdateOptions) {
        const dataView = options.dataViews && options.dataViews[0] ? options.dataViews[0] : null
        this.rootElement.empty();
        if (dataView) {
            this.settings = VisualSettings.parse<VisualSettings>(dataView);
            const columnDisplayName: string = dataView.metadata.columns[0].displayName
            const value: number = <number>dataView.single.value;
            const enableCustomFontSizes: boolean = this.settings.donut.enableCustomFontSizes;
            const fontFamily: string = this.settings.donut.fontFamily;
            const fontBold: string = this.settings.donut.fontBold ? "bold" : "normal";
            const fontItalic: string = this.settings.donut.fontItalic ? "italic" : "normal";
            const fontSize: number = this.settings.donut.fontSize;
            const fontColor: string = this.settings.donut.fontColor;
            const valueDecimalPlaces: any = this.settings.donut.valueDecimalPlaces;
            const outerLineColor: string = this.settings.donut.outerLineColor;
            const innerLineColor: string = this.settings.donut.innerLineColor;
            const backgroundColor: string = this.settings.donut.backgroundColor;
            const outerLineWidth: number = this.settings.donut.outerLineWidth;
            const innerLineWidth: number = this.settings.donut.innerLineWidth;
            const amendmentSize: number = this.settings.donut.amendmentSize;
            const minLength: number = Math.min(options.viewport.width, options.viewport.height);
            const minFontSize: number = enableCustomFontSizes ? fontSize : Math.round(minLength / 12) * 2;
            const percent: number = value * 100;
            const showColor: string = outerLineColor;
            const outerDiv: JQuery = $("<div id='circle-graph'></div>").css({"backgroundColor": backgroundColor});
            this.rootElement.append(outerDiv);
            d3.select("#circle-graph").append("svg").attr("width", minLength).attr("height", minLength).append("g").
                attr("id", "arc-container")
            drawMain(columnDisplayName, minLength, percent, showColor, innerLineColor, minFontSize, fontBold, fontColor, fontItalic, fontFamily, valueDecimalPlaces, outerLineWidth, innerLineWidth, amendmentSize);
            this.tooltipServiceWrapper.addTooltip(
                d3.select(".fore-circle"),
                (datapoint: any) => {
                  return datapoint.tooltipInfo;
                }
            )
        } else {
            this.rootElement.append($("<div>")
                .text("Please add a measure")
                .css({
                    "display": "table-cell",
                    "text-align": "center",
                    "vertical-align": "middle",
                    "text-wrap": "none",
                    "width": options.viewport.width,
                    "height": options.viewport.height,
                    "color": "red"
                }));
        }
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        const objectName: string = options.objectName;
        const objectEnumeration: VisualObjectInstance[] = [];
        switch (objectName) {
            case 'donut':
                objectEnumeration.push({
                    objectName: objectName,
                    displayName: objectName,
                    properties: {
                        enableCustomFontSizes: this.settings.donut.enableCustomFontSizes,
                        fontFamily: this.settings.donut.fontFamily,
                        fontBold: this.settings.donut.fontBold,
                        fontItalic: this.settings.donut.fontItalic,
                        fontSize: this.settings.donut.fontSize,
                        fontColor: this.settings.donut.fontColor,
                        backgroundColor: this.settings.donut.backgroundColor,
                        outerLineColor: this.settings.donut.outerLineColor,
                        innerLineColor: this.settings.donut.innerLineColor,
                        valueDecimalPlaces: this.settings.donut.valueDecimalPlaces,
                        outerLineWidth: this.settings.donut.outerLineWidth,
                        innerLineWidth: this.settings.donut.innerLineWidth,
                        amendmentSize: this.settings.donut.amendmentSize
                    },
                    propertyInstanceKind: {
                        fontColor: VisualEnumerationInstanceKinds.ConstantOrRule,
                        backgroundColor: VisualEnumerationInstanceKinds.ConstantOrRule,
                        outerLineColor: VisualEnumerationInstanceKinds.ConstantOrRule,
                        innerLineColor: VisualEnumerationInstanceKinds.ConstantOrRule
                    },
                    altConstantValueSelector: null,
                    validValues: {
                        outerLineWidth: { numberRange: { min: 1, max: 100 } },
                        innerLineWidth: { numberRange: { min: 1, max: 100 } },
                        amendmentSize: { numberRange: { min: 1, max: 100 } },
                        fontSize: { numberRange: { min: 1, max: 100 } },
                        valueDecimalPlaces: { numberRange: { min: 0, max: 10 } }
                    },
                    selector: null
                });
                break;
        }

        return objectEnumeration;
        // return VisualSettings.enumerateObjectInstances(this.settings || <VisualSettings>VisualSettings.getDefault(), options);
    }
}
