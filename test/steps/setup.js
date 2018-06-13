/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import elements from 'lisk-elements';
import cryptography from '../../src/utils/cryptography';
import * as fsUtils from '../../src/utils/fs';
import * as helpers from '../../src/utils/helpers';
import * as input from '../../src/utils/input';
import * as inputUtils from '../../src/utils/input/utils';
import logger from '../../src/utils/logger';
import * as mnemonicInstance from '../../src/utils/mnemonic';
import transactions from '../../src/utils/transactions';
// Use require for stubbing
const config = require('../../src/utils/config');
const getAPIClient = require('../../src/utils/api');
const print = require('../../src/utils/print');
const query = require('../../src/utils/query');

const NON_INTERACTIVE_MODE = 'NON_INTERACTIVE_MODE';
const EXEC_FILE_CHILD = 'EXEC_FILE_CHILD';
const LISK_COMMANDER_CONFIG_DIR = 'LISK_COMMANDER_CONFIG_DIR';
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

const setUpConfigStubs = () => {
	sandbox.stub(config, 'getConfig');
	sandbox.stub(config, 'setConfig').returns(true);
};

const setUpLockfileStubs = () => {
	sandbox.stub(lockfile, 'lock');
	sandbox.stub(lockfile, 'checkSync').returns(false);
	sandbox.stub(lockfile, 'lockSync');
	sandbox.stub(lockfile, 'unlockSync');
};

const setUpProcessStubs = () => {
	sandbox.stub(process, 'exit');
};

const setUpReadlineStubs = () => {
	sandbox.stub(readline, 'createInterface');
};

function setUpLiskElementsAPIStubs() {
	const queryDefaultResult = { success: true };
	const broadcastTransactionResponse = {
		message: 'Transaction accepted by the node for processing',
	};
	const broadcastSignaturesResponse = {
		message: 'Signature is accepted by the node for processing',
	};
	this.test.ctx.queryResult = queryDefaultResult;
	this.test.ctx.broadcastTransactionResponse = broadcastTransactionResponse;
	this.test.ctx.broadcastSignaturesResponse = broadcastSignaturesResponse;
	sandbox.stub(getAPIClient, 'default').returns({
		delegates: {
			get: sandbox.stub().resolves(queryDefaultResult),
		},
		blocks: {
			get: sandbox.stub().resolves(queryDefaultResult),
		},
		accounts: {
			get: sandbox.stub().resolves(queryDefaultResult),
		},
		transactions: {
			get: sandbox.stub().resolves(queryDefaultResult),
			broadcast: sandbox.stub().resolves(broadcastTransactionResponse),
		},
		signatures: {
			get: sandbox.stub().resolves(queryDefaultResult),
			broadcast: sandbox.stub().resolves(broadcastSignaturesResponse),
		},
	});
}

const setUpLiskElementsCryptoStubs = () => {
	[
		'encryptMessageWithPassphrase',
		'decryptMessageWithPassphrase',
		'encryptPassphraseWithPassword',
		'decryptPassphraseWithPassword',
		'getKeys',
		'getAddressFromPublicKey',
		'getAddressAndPublicKeyFromPassphrase',
		'signMessageWithPassphrase',
		'verifyMessageWithPublicKey',
		'parseEncryptedPassphrase',
		'stringifyEncryptedPassphrase',
	].forEach(methodName => sandbox.stub(elements.cryptography, methodName));
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
		'verifyMessage',
	].forEach(methodName => sandbox.stub(cryptography, methodName));
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
	sandbox.stub(query, 'default');
};

const setUpTransactionsStubs = () => {
	[
		'transfer',
		'registerSecondPassphrase',
		'registerDelegate',
		'castVotes',
		'registerMultisignature',
	].forEach(methodName => sandbox.stub(transactions, methodName));
	transactions.utils = {
		verifyTransaction: sandbox.stub().returns(true),
		prepareTransaction: sandbox.stub(),
	};
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

function setUpLogStubs() {
	['warn', 'error'].forEach(methodName => sandbox.stub(logger, methodName));
}

function setUpPrintStubs() {
	const printFunction = sandbox.spy();
	sandbox.stub(print, 'default').returns(printFunction);
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
	setUpLiskElementsAPIStubs.call(this);
	this.test.ctx.apiResponse = this.test.ctx.broadcastSignaturesResponse;
}

export function setUpCommandBroadcastTransaction() {
	setUpLiskElementsAPIStubs.call(this);
	this.test.ctx.apiResponse = this.test.ctx.broadcastTransactionResponse;
}

export function setUpCommandCreateAccount() {
	setUpCryptoStubs();
	setUpMnemonicStubs();
}

export function setUpCommandShowAccount() {
	setUpLiskElementsCryptoStubs();
	setUpInputStubs();
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

export function setUpCommandConfig() {
	setUpConfigStubs();
}

export function setUpCommandSet() {
	setUpConfigStubs();
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

export function setUpCommandVerifyMessage() {
	setUpCryptoStubs();
	setUpInputStubs();
}

export function setUpCommandVerifyTransaction() {
	setUpTransactionsStubs();
	setUpReadlineStubs();
	setUpInputUtilsStubs();
}

export function setUpCommandSignTransaction() {
	setUpTransactionsStubs();
	setUpReadlineStubs();
	setUpInputStubs();
	setUpInputUtilsStubs();
}

export function setUpUtilAPI() {
	setUpConfigStubs();
}

export function setUpUtilConfig() {
	setUpEnvVariable(EXEC_FILE_CHILD).call(this);
	setUpEnvVariable(LISK_COMMANDER_CONFIG_DIR).call(this);
	setUpFsStubs();
	setUpFsUtilsStubs();
	setUpConsoleStubs();
	setUpLockfileStubs();
	setUpLogStubs();
	setUpPrintStubs.call(this);
	setUpProcessStubs();
	delete require.cache[require.resolve(CONFIG_PATH)];
}

export function tearDownUtilConfig() {
	restoreEnvVariable(EXEC_FILE_CHILD).call(this);
	restoreEnvVariable(LISK_COMMANDER_CONFIG_DIR).call(this);
}

export function setUpUtilCreateCommand() {
	setUpPrintStubs.call(this);
}

export function setUpUtilCrypto() {
	setUpLiskElementsCryptoStubs();
}

export function setUpUtilHelpersJSONOutput() {
	setUpConfigStubs();
}

export function setUpUtilHelpersPrettyOutput() {
	setUpConfigStubs();
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

export function setUpUtilQuery() {
	setUpLiskElementsAPIStubs.call(this);
}

export function setUpUtilLog() {
	delete require.cache[require.resolve('../../src/utils/logger')];
	setUpConsoleStubs();
}

export function setUpUtilPrint() {
	setUpConfigStubs();
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
