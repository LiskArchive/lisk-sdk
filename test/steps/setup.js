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
import * as fsUtils from '../../src/utils/fs';
import * as helpers from '../../src/utils/helpers';
import * as input from '../../src/utils/input';
import * as inputUtils from '../../src/utils/input/utils';
import * as print from '../../src/utils/print';

const NON_INTERACTIVE_MODE = 'NON_INTERACTIVE_MODE';
const TEST_PASSPHRASE = 'TEST_PASSPHRASE';
const CONFIG_PATH = '../../src/utils/env';

const setUpChildProcessStubs = () => {
	sandbox.stub(childProcess, 'exec');
};

const setUpFsStubs = () => {
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

const setUpConsoleStubs = () => {
	[
		'info',
		'warn',
		'error',
	].forEach(methodName => sandbox.stub(console, methodName));
};

const setUpProcessStubs = () => {
	sandbox.stub(process, 'exit');
};

const setUpHelperStubs = () => {
	[
		'createErrorHandler',
		'deAlias',
		'shouldUseJsonOutput',
		'shouldUsePrettyOutput',
	].forEach(methodName => sandbox.stub(helpers, methodName));
};

const setUpInputStubs = () => {
	sandbox.stub(input, 'default').resolves({});
};

const setUpInputUtilsStubs = () => {
	[
		'getStdIn',
		'getData',
		'getPassphrase',
	].forEach(methodName => sandbox.stub(inputUtils, methodName));
	inputUtils.getStdIn.resolves({});
};

function setUpPrintStubs() {
	const printFunction = sandbox.spy();
	sandbox.stub(print, 'printResult').returns(printFunction);
	this.test.ctx.printFunction = printFunction;
}

const setUpEnvVariable = variable => function setUpEnv() {
	this.test.ctx.initialEnvVariableValue = process.env[variable];
};

const restoreEnvVariable = variable => function restoreEnv() {
	const { initialEnvVariableValue } = this.test.ctx;
	if (typeof initialEnvVariableValue !== 'undefined') process.env[variable] = initialEnvVariableValue;
};

export function setUpCommandCreateTransactionCreateMultisignatureAccount() {
	setUpInputStubs();
}

export function setUpCommandCreateTransactionRegisterDelegateCommand() {
	setUpInputStubs();
}

export function setUpCommandCreateTransactionRegisterSecondPassphrase() {
	setUpInputStubs();
}

export function setUpCommandDecryptMessage() {
	setUpInputStubs();
}

export function setUpCommandDecryptPassphrase() {
	setUpInputStubs();
}

export function setUpCommandEncryptMessage() {
	setUpInputStubs();
}

export function setUpCommandEncryptPassphrase() {
	setUpInputStubs();
}

export function setUpCommandSet() {
	setUpEnvVariable(NON_INTERACTIVE_MODE).call(this);
	setUpFsStubs();
}

export function tearDownCommandSet() {
	restoreEnvVariable(NON_INTERACTIVE_MODE).call(this);
}

export function setUpUtilInput() {
	setUpInputUtilsStubs();
}

export function setUpUtilInputUtils() {
	setUpEnvVariable(TEST_PASSPHRASE);
	setUpFsStubs();
}

export function tearDownUtilInputUtils() {
	restoreEnvVariable(TEST_PASSPHRASE);
}

export function setUpUtilEnv() {
	setUpFsStubs();
	setUpConsoleStubs();
	setUpProcessStubs();
	delete require.cache[require.resolve(CONFIG_PATH)];
}

export function setUpUtilWrapActionCreator() {
	setUpPrintStubs.call(this);
}

export function setUpUtilPrint() {
	setUpHelperStubs();
}

export function setUpExecFile() {
	setUpFsStubs();
	setUpChildProcessStubs();
}
