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
import childProcess from 'child_process';
import fs from 'fs';
import * as createAccount from '../../src/commands/createAccount';
import * as createTransactionRegisterDelegate from '../../src/commands/createTransactionRegisterDelegate';
import * as createTransactionCreateMultisignatureAccount from '../../src/commands/createTransactionCreateMultisignatureAccount';
import * as createTransactionRegisterSecondPassphrase from '../../src/commands/createTransactionRegisterSecondPassphrase';
import * as decryptMessage from '../../src/commands/decryptMessage';
import * as decryptPassphrase from '../../src/commands/decryptPassphrase';
import * as encryptMessage from '../../src/commands/encryptMessage';
import * as encryptPassphrase from '../../src/commands/encryptPassphrase';
import * as env from '../../src/commands/env';
import * as get from '../../src/commands/get';
import * as list from '../../src/commands/list';
import * as set from '../../src/commands/set';
import * as fsUtils from '../../src/utils/fs';
import * as helpers from '../../src/utils/helpers';
import * as input from '../../src/utils/input';
import * as print from '../../src/utils/print';

export const DEFAULT_ERROR_MESSAGE = 'Cannot read property \'length\' of null';

const BOOLEANS = {
	true: true,
	false: false,
};

const regExpQuotes = /"((.|\n|\s\S)+?)"/;
const regExpNumbers = /\d+/;
const regExpBooleans = /(true|false)/;

export const getFirstQuotedString = title => title.match(regExpQuotes)[1];

export const getQuotedStrings = (title) => {
	const globalRegExp = new RegExp(regExpQuotes, 'g');
	return title
		.match(globalRegExp)
		.map(match => match.match(regExpQuotes)[1]);
};

export const getFirstNumber = title => Number(title.match(regExpNumbers)[0]);

export const getNumbers = (title) => {
	const globalRegExp = new RegExp(regExpNumbers, 'g');
	return title
		.match(globalRegExp)
		.map(Number);
};

export const getFirstBoolean = title => BOOLEANS[title.match(regExpBooleans)[1]];

export const getBooleans = (title) => {
	const globalRegExp = new RegExp(regExpBooleans, 'g');
	return title
		.match(globalRegExp)
		.map(key => BOOLEANS[key]);
};

export const getCommandInstance = (vorpal, command) => {
	const commandStem = command.match(/^[^[|<]+/)[0].slice(0, -1);
	return vorpal.find(commandStem);
};

export const getActionCreator = actionName => ({
	'create account': createAccount.actionCreator,
	'decrypt message': decryptMessage.actionCreator,
	'decrypt passphrase': decryptPassphrase.actionCreator,
	'encrypt message': encryptMessage.actionCreator,
	'encrypt passphrase': encryptPassphrase.actionCreator,
	'create transaction register delegate': createTransactionRegisterDelegate.actionCreator,
	'create transaction create multisignature account': createTransactionCreateMultisignatureAccount.actionCreator,
	'create transaction register second passphrase': createTransactionRegisterSecondPassphrase.actionCreator,
	env: env.actionCreator,
	get: get.actionCreator,
	list: list.actionCreator,
	set: set.actionCreator,
})[actionName];

export const setUpChildProcessStubs = () => {
	sandbox.stub(childProcess, 'exec');
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
		'createErrorHandler',
		'deAlias',
		'shouldUseJsonOutput',
		'shouldUsePrettyOutput',
	].forEach(methodName => sandbox.stub(helpers, methodName));
};

export const setUpInputStubs = () => {
	[
		'getStdIn',
		'getData',
		'getPassphrase',
	].forEach(methodName => sandbox.stub(input, methodName).resolves({}));
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

export function getTransactionCreatorFunctionNameByType(transactionType) {
	switch (transactionType) {
	case 0:	return 'createTransaction';
	case 1: return 'signTransaction';
	case 2:	return 'createDelegate';
	case 3: return 'createVote';
	case 4: return 'createMultisignature';
	default: throw new Error(`Transaction type ${transactionType} is not supported`);
	}
}

export const hasAncestorWithTitleMatching = (test, regExp) => {
	if (test.title.match(regExp)) return true;
	const { parent } = test;
	if (!parent) return false;
	return hasAncestorWithTitleMatching(parent, regExp);
};
