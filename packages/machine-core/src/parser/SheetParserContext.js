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
const { FunctionErrors, ErrorInfo } = require('@cedalo/error-codes');
const { ParserContext, Term } = require('@cedalo/parser');
const logger = require('../logger').create({ name: 'SheetParserContext' });
const FunctionRegistry = require('../FunctionRegistry');
const ErrorTerm = require('./ErrorTerm');
const { referenceFromNode } = require('./References');

// DL-1431
const EXCLUDE_FUNCTIONS = ['ACOS', 'ASIN', 'ATAN', 'ATAN2'];
const filter = (functions) => Object.entries(functions).reduce((acc, [name, func]) => {
		if (!EXCLUDE_FUNCTIONS.includes(name)) acc[name] = func;
		return acc;
	}, {});

const executor = (func) => function wrappedFunction(sheet, ...terms) {
	let result;
	const term = wrappedFunction.term;
	func.term = term; // deprecated
	func.context = term.context;
	wrappedFunction.displayName = func.displayName;
	try {
		result = func(sheet, ...terms);
	} catch (err) {
		logger.error('Error', err);
		return ErrorInfo.create(FunctionErrors.code.FUNC_EXEC, err.message, term.name);
	}
	func.term = undefined;
	func.context = undefined;
	return result;
};

// DL-1253: an identifier can contain an error code, so create an ErrorTerm for it
const createErrorTermFromNode = (node) =>
	node.type === 'identifier' && FunctionErrors.isError(node.value) ? ErrorTerm.fromError(node.value) : undefined;

const referenceTerm = (node, context) => {
	const operand = referenceFromNode(node, context);
	if (operand) {
		const term = new Term();
		term.operand = operand;
		return term;
	}
	return createErrorTermFromNode(node);
};

// for internally use only => to ease parsing 
const noop = (/* sheet, ...terms */) => null;

class SheetParserContext extends ParserContext {
	constructor() {
		super();
		this.strict = true;
		this.functions = Object.assign({ NOOP: noop }, filter(this.functions));
	}

	// node: is a parser AST node
	// return a reference term or undefined...
	createReferenceTerm(node) {
		return referenceTerm(node, this);
	}

	getFunction(id) {
		const func = FunctionRegistry.getFunction(id) || super.getFunction(id);
		// wrap into an execution function...
		return func ? executor(func) : func;
	}

	hasFunction(id) {
		return FunctionRegistry.hasFunction(id) || super.hasFunction(id);
	}
}

module.exports = SheetParserContext;
