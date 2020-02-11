import {
	default as JSG,
	GraphUtils,
	MathUtils,
	SheetPlotNode,
	TextFormatAttributes
} from '@cedalo/jsg-core';
import { NumberFormatter } from '@cedalo/number-format';

import NodeView from './NodeView';

export default class SheetPlotView extends NodeView {
	onSelectionChange(selected) {
		if (!selected) {
			this.chartSelection = undefined;
			this.getGraphView().clearLayer('chartselection');
		}
	}

	drawBorder(graphics, format, rect) {
		super.drawBorder(graphics, format, rect);
	}

	drawFill(graphics, format, rect) {
		super.drawFill(graphics, format, rect);

		const item = this.getItem();

		if (item._isFeedback) {
			return;
		}

		item.setMinMax();

		const { series } = item;
		const plotRect = item.plot.position;
		const axes = item.getAxes(0, 0);

		if (!axes) {
			return;
		}

		graphics.setFontSize(8);
		graphics.setFontStyle(TextFormatAttributes.FontStyle.NORMAL);
		graphics.setFont();

		this.drawXAxes(graphics, plotRect, item);
		this.drawYAxes(graphics, plotRect, item);

		series.forEach((serie, index) => {
			this.drawPlot(graphics, item, plotRect, serie, index, axes);
		});

		this.drawLegend(graphics, plotRect, item);

		graphics.setFontSize(12);
		graphics.setFontStyle(TextFormatAttributes.FontStyle.BOLD);
		graphics.setFont();

		this.drawTitle(graphics, item);
	}

	drawLegend(graphics, plotRect, item) {
		const legendData = item.getLegend();
		const margin = 200;
		const metrics = GraphUtils.getFontMetricsEx('Verdana', 8);
		const { legend } = item;

		graphics.beginPath();
		graphics.rect(legend.position.left, legend.position.top, legend.position.width, legend.position.height);
		graphics.stroke();

		graphics.setTextAlignment(TextFormatAttributes.TextAlignment.LEFT);
		graphics.setTextBaseline('center');

		let y = legend.position.top + margin;
		legendData.forEach((entry, index) => {

			graphics.beginPath();
			graphics.setLineColor(entry.series.line && entry.series.line.color ? entry.series.line.color : SheetPlotNode.defaultColors.line[index]);
			graphics.setLineWidth(50);
			graphics.moveTo(legend.position.left + margin, y + metrics.lineheight / 2);
			graphics.lineTo(legend.position.left + margin * 4, y + metrics.lineheight / 2);
			graphics.stroke();

			graphics.fillText(entry.name, legend.position.left + margin * 5, y + metrics.lineheight / 2);
			y += metrics.lineheight;
		});
	}

	drawXAxes(graphics, plotRect, item) {
		const axes = item.xAxes;

		axes.forEach((axis) => {
			if (axis.position) {
				// draw axis line
				graphics.beginPath();
				graphics.setLineColor('#AAAAAA');
				graphics.moveTo(axis.position.left, axis.position.top);
				graphics.lineTo(axis.position.right, axis.position.top);
				graphics.stroke();

				graphics.setTextBaseline('top');
				graphics.setFillColor('#000000');
				graphics.setTextAlignment(TextFormatAttributes.TextAlignment.CENTER);

				let current = axis.scale.min;
				let x;

				if (axis.type === 'time') {
					axis.scale.format = {
						localCulture: `time;en`,
						numberFormat: 'h:mm:ss',
					};
				}

				while (current <= axis.scale.max) {
					x = item.scaleToAxis(axis.scale, current);
					if (axis.scale.format) {
						const text = this.formatNumber(current, axis.scale.format.numberFormat,
							axis.scale.format.localCulture);
						graphics.fillText(`${text}`, plotRect.left + x * plotRect.width, axis.position.top + 150);
					} else {
						graphics.fillText(`${current}`, plotRect.left + x * plotRect.width, axis.position.top + 150);
					}
					current += axis.scale.step;
					current = MathUtils.roundTo(current, 12);
				}
			}
		});
	}

	drawYAxes(graphics, plotRect, item) {
		const axes = item.yAxes;

		axes.forEach((axis) => {
			if (axis.position) {
				graphics.beginPath();
				graphics.setLineColor('#AAAAAA');
				graphics.moveTo(axis.position.right, axis.position.top);
				graphics.lineTo(axis.position.right, axis.position.bottom);
				graphics.stroke();

				graphics.setTextBaseline('middle');
				graphics.setFillColor('#000000');
				graphics.setTextAlignment(TextFormatAttributes.TextAlignment.RIGHT);

				let current = axis.scale.min;
				let y;
				let yPlot;

				graphics.beginPath();
				graphics.setLineColor('#CCCCCC');

				while (current <= axis.scale.max) {
					y = item.scaleToAxis(axis.scale, MathUtils.roundTo(current, 12));
					yPlot = plotRect.bottom - y * plotRect.height
					if (axis.scale.format) {
						const text = this.formatNumber(current, axis.scale.format.numberFormat,
							axis.scale.format.localCulture);
						graphics.fillText(`${text}`, axis.position.right - 150, yPlot);
					} else {
						graphics.fillText(`${current}`, axis.position.right - 150, yPlot);
					}
					graphics.moveTo(plotRect.left, yPlot);
					graphics.lineTo(plotRect.right, yPlot);
					current += axis.scale.step;
					current = MathUtils.roundTo(current, 12);
				}

				graphics.stroke();
			}
		});
	}

	drawPlot(graphics, item, plotRect, serie, seriesIndex, axes) {
		let index = 0;
		let x;
		let y;
		const value = {};

		const ref = item.getDataSourceInfo(serie.formula);
		if (!ref) {
			return;
		}

		graphics.save();
		graphics.beginPath();
		graphics.rect(plotRect.left, plotRect.top, plotRect.width, plotRect.height);
		graphics.clip();

		graphics.beginPath();
		graphics.setLineColor(serie.line && serie.line.color ? serie.line.color : SheetPlotNode.defaultColors.line[seriesIndex]);
		graphics.setLineWidth(50);

		while (item.getValue(ref, index, value)) {
			x = item.scaleToAxis(axes.x.scale, value.x);
			y = item.scaleToAxis(axes.y.scale, value.y);
			if (index) {
				graphics.lineTo(plotRect.left + x * plotRect.width, plotRect.bottom - y * plotRect.height);
			} else {
				graphics.moveTo(plotRect.left + x * plotRect.width, plotRect.bottom - y * plotRect.height);
			}
			index += 1;
		}

		graphics.stroke();
		graphics.setLineWidth(-1);
		graphics.restore();
	}

	drawTitle(graphics, item) {
		const { title } = item;

		const text = String(item.getExpressionValue(title.formula));

		graphics.setTextBaseline('top');
		graphics.setFillColor('#000000');
		graphics.setTextAlignment(TextFormatAttributes.TextAlignment.CENTER);
		graphics.fillText(text, title.position.left + title.position.width / 2, title.position.top);
	}

	formatNumber(value, numberFormat, localCulture) {
		// somehow the scale value sometimes does not show correct values
		value = MathUtils.roundTo(value, 12);
		if (numberFormat && numberFormat !== 'General' && localCulture) {
			let formattingResult = {
				value,
				formattedValue: value,
				color: undefined,
				type: 'general'
			};
			const type = localCulture.split(';');
			try {
				formattingResult = NumberFormatter.formatNumber(numberFormat, formattingResult.value, type[0]);
			} catch (e) {
				formattingResult.formattedValue = '#####';
			}

			return formattingResult.formattedValue;
		}
		return String(value);
	}

	hasSelectedFormula(sheet) {
		if (this.chartSelection) {
			switch (this.chartSelection.element) {
			case 'datarow':
			case 'title':
			case 'xAxis':
			case 'yAxis':
				return true;
			default:
				return false;
			}
		}

		return false;
	}

	getSelectedFormula(sheet) {
		let expr;

		if (this.chartSelection) {
			switch (this.chartSelection.element) {
			case 'datarow':
			case 'xAxis':
			case 'yAxis':
			case 'title':
				expr = this.chartSelection.data.formula;
				break;
			default:
				break;
			}
		}

		if (expr) {
			if (expr.getTerm()) {
				const formula = `=${expr.getTerm().toLocaleString(JSG.getParserLocaleSettings(), {
					item: sheet,
					useName: true,
				})}`;
				return formula
			} else {
				return expr.getValue();
			}
		}

		return super.getSelectedFormula(sheet);
	}
}