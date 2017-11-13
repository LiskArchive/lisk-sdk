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
import readline from 'readline';
import lisk from 'lisk-js';
import cryptoInstance from '../../src/utils/cryptoModule';
import * as fsUtils from '../../src/utils/fs';
import * as helpers from '../../src/utils/helpers';
import * as input from '../../src/utils/input';
import * as inputUtils from '../../src/utils/input/utils';
import * as mnemonicInstance from '../../src/utils/mnemonic';
import * as print from '../../src/utils/print';
import queryInstance from '../../src/utils/query';
import transactions from '../../src/utils/transactions';

const NON_INTERACTIVE_MODE = 'NON_INTERACTIVE_MODE';
const TEST_PASSPHRASE = 'TEST_PASSPHRASE';
const CONFIG_PATH = '../../src/utils/env';

const setUpChildProcessStubs = () => {
	sandbox.stub(childProcess, 'exec');
};

const setUpFsStubs = () => {
	[
		'accessSync',
		'createReadStream',
		'existsSync',
		'mkdirSync',
		'readFileSync',
		'writeFileSync',
	].forEach(methodName => sandbox.stub(fs, methodName));
};

const setUpFsUtilsStubs = () => {
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

const setUpJSONStubs = () => {
	[
		'parse',
		'stringify',
	].forEach(methodName => sandbox.stub(JSON, methodName));
};

const setUpProcessStubs = () => {
	sandbox.stub(process, 'exit');
};

const setUpReadlineStubs = () => {
	sandbox.stub(readline, 'createInterface');
};

const setUpLiskJSCryptoStubs = () => {
	[
		'getKeys',
		'encryptPassphraseWithPassword',
		'decryptPassphraseWithPassword',
		'encryptMessageWithSecret',
		'decryptMessageWithSecret',
		'getAddressFromPublicKey',
	].forEach(methodName => sandbox.stub(lisk.crypto, methodName));
};

const setUpCryptoStubs = () => {
	[
		'encryptMessage',
		'decryptMessage',
		'encryptPassphrase',
		'decryptPassphrase',
		'getKeys',
		'getAddressFromPublicKey',
	].forEach(methodName => sandbox.stub(cryptoInstance, methodName));
};

const setUpHelperStubs = () => {
	[
		'createErrorHandler',
		'deAlias',
		'shouldUseJsonOutput',
		'shouldUsePrettyOutput',
	].forEach(methodName => sandbox.stub(helpers, methodName));
};

const setUpMnemonicStubs = () => {
	sandbox.stub(mnemonicInstance, 'createMnemonicPassphrase');
};

const setUpQueryStubs = () => {
	sandbox.stub(queryInstance, 'getAccount');
	sandbox.stub(queryInstance, 'getBlock');
	sandbox.stub(queryInstance, 'getDelegate');
	sandbox.stub(queryInstance, 'getTransaction');
};

const setUpTransactionsStubs = () => {
	[
		'createTransaction',
		'signTransaction',
		'createMultisignature',
		'createSignature',
		'createDelegate',
		'createVote',
	].forEach(methodName => sandbox.stub(transactions, methodName));
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

export function setUpCommandCreateAccount() {
	setUpCryptoStubs();
	setUpMnemonicStubs();
}

export function setUpCommandCreateTransactionTransfer() {
	setUpTransactionsStubs();
	setUpInputStubs();
}

export function setUpCommandCreateTransactionCreateMultisignatureAccount() {
	setUpTransactionsStubs();
	setUpInputStubs();
}

export function setUpCommandCreateTransactionRegisterDelegateCommand() {
	setUpTransactionsStubs();
	setUpInputStubs();
}

export function setUpCommandCreateTransactionRegisterSecondPassphrase() {
	setUpTransactionsStubs();
	setUpInputStubs();
}

export function setUpCommandDecryptMessage() {
	setUpCryptoStubs();
	setUpInputStubs();
}

export function setUpCommandDecryptPassphrase() {
	setUpCryptoStubs();
	setUpInputStubs();
}

export function setUpCommandEncryptMessage() {
	setUpCryptoStubs();
	setUpInputStubs();
}

export function setUpCommandEncryptPassphrase() {
	setUpCryptoStubs();
	setUpInputStubs();
}

export function setUpCommandGet() {
	setUpQueryStubs();
}

export function setUpCommandList() {
	setUpQueryStubs();
}

export function setUpCommandSet() {
	setUpEnvVariable(NON_INTERACTIVE_MODE).call(this);
	setUpFsStubs();
	setUpFsUtilsStubs();
}

export function tearDownCommandSet() {
	restoreEnvVariable(NON_INTERACTIVE_MODE).call(this);
}

export function setUpUtilCrypto() {
	setUpLiskJSCryptoStubs();
}

export function setUpUtilFs() {
	setUpFsStubs();
	setUpJSONStubs();
}

export function setUpUtilInput() {
	setUpInputUtilsStubs();
	setUpReadlineStubs();
}

export function setUpUtilInputUtils() {
	setUpEnvVariable(TEST_PASSPHRASE);
	setUpFsStubs();
	setUpFsUtilsStubs();
	setUpReadlineStubs();
}

export function tearDownUtilInputUtils() {
	restoreEnvVariable(TEST_PASSPHRASE);
}

export function setUpUtilEnv() {
	setUpFsStubs();
	setUpFsUtilsStubs();
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
	setUpFsUtilsStubs();
	setUpChildProcessStubs();
}
