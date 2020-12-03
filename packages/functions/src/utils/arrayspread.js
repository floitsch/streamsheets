/********************************************************************************
 * Copyright (c) 2020 Cedalo AG
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 ********************************************************************************/
const { isType, ObjectTerm } = require('@cedalo/machine-core');
const { Term } = require('@cedalo/parser');

const termFromValue = (value) => (isType.object(value) ? new ObjectTerm(value) : Term.fromValue(value));
const setCellAt = (index, value, sheet) => {
	// handle empty strings like undefined!
	if (value == null || value === '') {
		sheet.setCellAt(index, undefined);
	} else {
		const cell = sheet.cellAt(index, true);
		cell.value = value;
		cell.term = termFromValue(value);
	}
};

const mapCol = (horizontally) => (horizontally ? (coord) => coord.x : (coord) => coord.y);
const mapRow = (horizontally) => (horizontally ? (coord) => coord.y : (coord) => coord.x);
const mapValues = (values, horizontally) => {
	const col = mapCol(horizontally);
	const row = mapRow(horizontally);
	return (coord) => {
		const list = values[row(coord)];
		return list ? list[col(coord)] : undefined;
	};
};

const toRangeGrow =  (lists, range, horizontally, setCell) => {
	const sheet = range.sheet;
	const index = range.start.copy();
	const startcol = index.col;
	const startrow = index.row;
	if (setCell == null) setCell = setCellAt;
	lists.forEach((values, row) => {
		values.forEach((value, col) => {
			if (horizontally) index.set(startrow + row, startcol + col);
			else index.set(startrow + col, startcol + row);
			setCell(index, value, sheet);
		});
	});
	return true;
};
const toRange = (lists, range, horizontally, setCell) => {
	const coord = { x: -1, y: -1 };
	const sheet = range.sheet;
	const getValue = mapValues(lists, horizontally);
	if (setCell == null) setCell = setCellAt;
	range.iterate((cell, index, nextrow) => {
		coord.x += 1;
		if (nextrow) {
			coord.x = 0;
			coord.y += 1;
		}
		const value = getValue(coord);
		setCell(index, value, sheet);
	});
	return true;
};

module.exports = {
	toRange,
	toRangeGrow
};