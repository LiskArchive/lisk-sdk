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
import lockfile from 'lockfile';
import lisk from 'lisk-js';
import liskAPIInstance from '../../src/utils/api';
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
const EXEC_FILE_CHILD = 'EXEC_FILE_CHILD';
const LISKY_CONFIG_DIR = 'LISKY_CONFIG_DIR';
const TEST_PASSPHRASE = 'TEST_PASSPHRASE';
const CONFIG_PATH = '../../src/utils/config';

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
	['readJSONSync', 'writeJSONSync'].forEach(methodName =>
		sandbox.stub(fsUtils, methodName),
	);
};

const setUpConsoleStubs = () => {
	['info', 'warn', 'error'].forEach(methodName =>
		sandbox.stub(console, methodName),
	);
};

const setUpJSONStubs = () => {
	['parse', 'stringify'].forEach(methodName => sandbox.stub(JSON, methodName));
};

const setUpLockfileStubs = () => {
	sandbox.stub(lockfile, 'lock');
};

const setUpProcessStubs = () => {
	sandbox.stub(process, 'exit');
};

const setUpReadlineStubs = () => {
	sandbox.stub(readline, 'createInterface');
};

function setUpLiskJSAPIStubs() {
	const broadcastTransactionResponse = {
		message: 'Transaction accepted by the node for processing',
	};
	const broadcastSignaturesResponse = {
		message: 'Signature is accepted by the node for processing',
	};
	this.test.ctx.broadcastTransactionResponse = broadcastTransactionResponse;
	this.test.ctx.broadcastSignaturesResponse = broadcastSignaturesResponse;

	sandbox
		.stub(liskAPIInstance, 'broadcastTransaction')
		.returns(broadcastTransactionResponse);
	sandbox
		.stub(liskAPIInstance, 'broadcastSignatures')
		.returns(broadcastSignaturesResponse);
}

const setUpLiskJSCryptoStubs = () => {
	[
		'encryptMessageWithPassphrase',
		'decryptMessageWithPassphrase',
		'encryptPassphraseWithPassword',
		'decryptPassphraseWithPassword',
		'getKeys',
		'getAddressFromPublicKey',
		'signMessageWithPassphrase',
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
		'signMessage',
	].forEach(methodName => sandbox.stub(cryptoInstance, methodName));
};

const setUpHelperStubs = () => {
	[
		'createErrorHandler',
		'deAlias',
		'shouldUseJSONOutput',
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
		'transfer',
		'registerSecondPassphrase',
		'registerDelegate',
		'castVotes',
		'registerMultisignature',
	].forEach(methodName => sandbox.stub(transactions, methodName));
};

const setUpInputStubs = () => {
	sandbox.stub(input, 'default').resolves({});
};

const setUpInputUtilsStubs = () => {
	['getStdIn', 'getData', 'getPassphrase'].forEach(methodName =>
		sandbox.stub(inputUtils, methodName),
	);
	inputUtils.getStdIn.resolves({});
};

function setUpPrintStubs() {
	['logError', 'logWarning'].forEach(methodName =>
		sandbox.stub(print, methodName),
	);

	const printFunction = sandbox.spy();
	sandbox.stub(print, 'printResult').returns(printFunction);
	this.test.ctx.printFunction = printFunction;
}

const setUpEnvVariable = variable =>
	function setUpEnv() {
		this.test.ctx.initialEnv = this.test.ctx.initialEnv || {};
		this.test.ctx.initialEnv[variable] = process.env[variable];
	};

const restoreEnvVariable = variable =>
	function restoreEnv() {
		const { initialEnv } = this.test.ctx;
		if (typeof initialEnv[variable] !== 'undefined') {
			process.env[variable] = initialEnv[variable];
		} else {
			delete process.env[variable];
		}
	};

export function setUpCommandBroadcastSignature() {
	setUpLiskJSAPIStubs.call(this);
	this.test.ctx.apiResponse = this.test.ctx.broadcastSignaturesResponse;
}

export function setUpCommandBroadcastTransaction() {
	setUpLiskJSAPIStubs.call(this);
	this.test.ctx.apiResponse = this.test.ctx.broadcastTransactionResponse;
}

export function setUpCommandCreateAccount() {
	setUpCryptoStubs();
	setUpMnemonicStubs();
}

export function setUpCommandCreateTransactionTransfer() {
	setUpTransactionsStubs();
	setUpInputStubs();
}

export function setUpCommandCreateTransactionCastVotes() {
	setUpInputStubs();
	setUpInputUtilsStubs();
	setUpTransactionsStubs();
	setUpFsStubs();
}

export function setUpCommandCreateTransactionRegisterDelegateCommand() {
	setUpTransactionsStubs();
	setUpInputStubs();
}

export function setUpCommandCreateTransactionRegisterMultisignatureAccount() {
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

export function setUpCommandSignMessage() {
	setUpCryptoStubs();
	setUpInputStubs();
}

export function setUpUtilConfig() {
	setUpEnvVariable(EXEC_FILE_CHILD).call(this);
	setUpEnvVariable(LISKY_CONFIG_DIR).call(this);
	setUpFsStubs();
	setUpFsUtilsStubs();
	setUpConsoleStubs();
	setUpLockfileStubs();
	setUpPrintStubs.call(this);
	setUpProcessStubs();
	delete require.cache[require.resolve(CONFIG_PATH)];
}

export function tearDownUtilConfig() {
	restoreEnvVariable(EXEC_FILE_CHILD).call(this);
	restoreEnvVariable(LISKY_CONFIG_DIR).call(this);
}

export function setUpUtilCreateCommand() {
	setUpPrintStubs.call(this);
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
	setUpEnvVariable(TEST_PASSPHRASE).call(this);
	setUpFsStubs();
	setUpFsUtilsStubs();
	setUpReadlineStubs();
}

export function tearDownUtilInputUtils() {
	restoreEnvVariable(TEST_PASSPHRASE).call(this);
}

export function setUpUtilPrint() {
	delete require.cache[require.resolve('../../src/utils/print')];
	setUpConsoleStubs();
	setUpHelperStubs();
}

export function setUpUtilWrapActionCreator() {
	setUpPrintStubs.call(this);
}

export function setUpExecFile() {
	setUpFsStubs();
	setUpFsUtilsStubs();
	setUpChildProcessStubs();
}
