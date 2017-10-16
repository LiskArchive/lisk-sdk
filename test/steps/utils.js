/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import fs from 'fs';
import * as fsUtils from '../../src/utils/fs';
import * as helpers from '../../src/utils/helpers';
import * as print from '../../src/utils/print';

export const DEFAULT_ERROR_MESSAGE = 'Cannot read property \'length\' of null';

const regExpQuotes = /"((.|\s\S)+?)"/;
const regExpNumbers = /\d+/g;

export const getFirstQuotedString = title => title.match(regExpQuotes)[1];

export const getQuotedStrings = (title) => {
	const globalRegExp = new RegExp(regExpQuotes, 'g');
	return title
		.match(globalRegExp)
		.map(match => match.match(regExpQuotes)[1]);
};

export const getNumbersFromTitle = (title) => {
	return title.match(regExpNumbers).map(Number);
};

export const setUpFsStubs = () => {
	[
		'accessSync',
		'existsSync',
		'mkdirSync',
		'readFileSync',
		'createReadStream',
	].forEach(methodName => sandbox.stub(fs, methodName));
	[
		'readJsonSync',
		'writeJsonSync',
	].forEach(methodName => sandbox.stub(fsUtils, methodName));
};

export const setUpConsoleStubs = () => {
	[
		'info',
		'warn',
		'error',
	].forEach(methodName => sandbox.stub(console, methodName));
};

export const setUpProcessStubs = () => {
	sandbox.stub(process, 'exit');
};

export const setUpHelperStubs = () => {
	[
		'deAlias',
		'shouldUseJsonOutput',
		'createErrorHandler',
	].forEach(methodName => sandbox.stub(helpers, methodName));
};

export function setUpPrintStubs() {
	const printFunction = sandbox.spy();
	sandbox.stub(print, 'printResult').returns(printFunction);
	this.test.ctx.printFunction = printFunction;
}

export const setUpEnvVariable = variable => function setUpEnv() {
	this.test.ctx.initialEnvVariableValue = process.env[variable];
};

export const restoreEnvVariable = variable => function restoreEnv() {
	const { initialEnvVariableValue } = this.test.ctx;
	if (typeof initialEnvVariableValue !== 'undefined') process.env[variable] = initialEnvVariableValue;
};

export const createFakeInterface = value => ({
	on: ((type, callback) => {
		if (type === 'line') {
			value.split('\n').forEach(callback);
		}
		if (type === 'close') {
			callback();
		}
		return createFakeInterface(value);
	}),
});

export const createStreamStub = on => ({
	resume: () => {},
	close: () => {},
	on,
});
