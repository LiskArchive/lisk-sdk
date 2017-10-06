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
import lisk from 'lisk-js';
import {
	readJsonSync,
	writeJsonSync,
} from '../../src/utils/fs';
import {
	createErrorHandler,
	deAlias,
	shouldUseJsonOutput,
} from '../../src/utils/helpers';
import {
	splitSource,
	createPromptOptions,
	getFirstLineFromString,
	getPassphraseFromPrompt,
	getStdIn,
	getPassphraseFromEnvVariable,
	getPassphraseFromFile,
	getPassphraseFromSource,
	getPassphrase,
	getDataFromFile,
	getData,
} from '../../src/utils/input';
import { printResult } from '../../src/utils/print';
import tablify from '../../src/utils/tablify';
import {
	DEFAULT_ERROR_MESSAGE,
} from './utils';

export function theResultIsPrinted() {
	const { vorpal, result } = this.test.ctx;
	this.test.ctx.returnValue = printResult(vorpal)(result);
}

export function theResultIsPrintedWithTheJSONOptionSetToTrue() {
	const { vorpal, result } = this.test.ctx;
	this.test.ctx.returnValue = printResult(vorpal, { json: true })(result);
}

export function theQueryInstanceGetsABlockUsingTheID() {
	const { queryInstance, blockId } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.isBlockQuery(blockId);
}

export function theQueryInstanceGetsAnAccountUsingTheAddress() {
	const { queryInstance, address } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.isAccountQuery(address);
}

export function theQueryInstanceGetsATransactionUsingTheID() {
	const { queryInstance, transactionId } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.isTransactionQuery(transactionId);
}

export function theQueryInstanceGetsADelegateUsingTheUsername() {
	const { queryInstance, delegateUsername } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.isDelegateQuery(delegateUsername);
}

export function theJSONIsRead() {
	const { filePath } = this.test.ctx;
	this.test.ctx.returnValue = readJsonSync(filePath);
}

export function theJSONIsWritten() {
	const { filePath, objectToWrite } = this.test.ctx;
	this.test.ctx.returnValue = writeJsonSync(filePath, objectToWrite);
}

export function theObjectIsTablified() {
	const { testObject } = this.test.ctx;
	this.test.ctx.returnValue = tablify(testObject);
}

export function theArrayIsTablified() {
	const { testArray } = this.test.ctx;
	this.test.ctx.returnValue = tablify(testArray);
}

export function noErrorOccursAttemptingToGetTheKeysForThePassphrase() {
	const { cryptoInstance, passphrase } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.getKeys(passphrase);
}

export function anErrorOccursAttemptingToGetTheKeysForThePassphrase() {
	const { cryptoInstance, passphrase } = this.test.ctx;

	lisk.crypto.getKeys.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.getKeys(passphrase);
}

export function noErrorOccursAttemptingToEncryptThePassphraseWithThePassword() {
	const { cryptoInstance, passphrase, password } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.encryptPassphrase(passphrase, password);
}

export function anErrorOccursAttemptingToEncryptThePassphraseWithThePassword() {
	const { cryptoInstance, passphrase, password } = this.test.ctx;

	lisk.crypto.encryptPassphraseWithPassword.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.encryptPassphrase(passphrase, password);
}

export function noErrorOccursAttemptingToDecryptThePassphraseWithThePassword() {
	const { cryptoInstance, cipherAndIv, password } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.decryptPassphrase(cipherAndIv, password);
}

export function anErrorOccursAttemptingToDecryptThePassphraseWithThePassword() {
	const { cryptoInstance, cipherAndIv, password } = this.test.ctx;

	lisk.crypto.decryptPassphraseWithPassword.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.decryptPassphrase(cipherAndIv, password);
}

export function noErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase() {
	const { cryptoInstance, message, passphrase, recipientKeys } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.encryptMessage(message, passphrase, recipientKeys.publicKey);
}

export function anErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase() {
	const { cryptoInstance, message, passphrase, recipientKeys } = this.test.ctx;

	lisk.crypto.encryptMessageWithSecret.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.encryptMessage(message, passphrase, recipientKeys.publicKey);
}

export function noErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey() {
	const { cryptoInstance, encryptedMessageWithNonce: { encryptedMessage, nonce }, recipientPassphrase, keys } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.decryptMessage(encryptedMessage, nonce, recipientPassphrase, keys.publicKey);
}

export function anErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey() {
	const { cryptoInstance, encryptedMessageWithNonce: { encryptedMessage, nonce }, recipientPassphrase, keys } = this.test.ctx;

	lisk.crypto.decryptMessageWithSecret.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.decryptMessage(encryptedMessage, nonce, recipientPassphrase, keys.publicKey);
}

export function theConfigIsLoaded() {
	// IMPORTANT: This is a workaround because Node’s `require` implementation uses `fs.readFileSync`.
	// If this step gets reused in other tests we’ll have to find a better solution.
	const isSpy = fs.readFileSync.restore;
	if (isSpy) fs.readFileSync.restore();

	const envPath = '../../src/utils/env';
	// eslint-disable-next-line global-require, import/no-dynamic-require
	this.test.ctx.config = require(envPath).default;

	if (isSpy) sandbox.stub(fs, 'readFileSync');
}

export function theSourceIsSplit() {
	const { source } = this.test.ctx;
	this.test.ctx.returnValue = splitSource(source);
}

export function createPromptOptionsIsCalledWithTheMessage() {
	const { promptMessage } = this.test.ctx;
	this.test.ctx.returnValue = createPromptOptions(promptMessage);
}

export function getPassphraseFromPromptIsCalled() {
	const { vorpal, displayName, shouldRepeat } = this.test.ctx;
	const returnValue = getPassphraseFromPrompt(vorpal, { displayName, shouldRepeat });

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getStdInIsCalledWithTheRelevantOptions() {
	const { passphraseIsRequired, dataIsRequired } = this.test.ctx;
	const options = (passphraseIsRequired || dataIsRequired)
		? {
			passphraseIsRequired,
			dataIsRequired,
		}
		: undefined;
	const returnValue = getStdIn(options);

	this.test.ctx.returnValue = returnValue;
	return returnValue;
}

export function getPassphraseFromEnvVariableIsCalled() {
	const { environmentalVariableName, displayName } = this.test.ctx;
	const returnValue = getPassphraseFromEnvVariable(environmentalVariableName, displayName);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseFromFileIsCalledOnThePath() {
	const { filePath } = this.test.ctx;
	const returnValue = getPassphraseFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseFromFileIsCalledOnThePathAndAnUnknownErrorOccurs() {
	const { filePath } = this.test.ctx;
	const returnValue = getPassphraseFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseFromSourceIsCalledWithTheRelevantSource() {
	const { passphraseSource, displayName } = this.test.ctx;
	const returnValue = getPassphraseFromSource(passphraseSource, { displayName });

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseIsPassedAPassphraseDirectly() {
	const { passphrase } = this.test.ctx;
	const returnValue = getPassphrase(null, null, passphrase);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseIsPassedASourceButNoPassphrase() {
	const { passphraseSource } = this.test.ctx;
	const returnValue = getPassphrase(null, passphraseSource);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseIsPassedNeitherASourceNorAPassphrase() {
	const { vorpal } = this.test.ctx;
	const returnValue = getPassphrase(vorpal);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getFirstLineFromStringIsCalledOnTheString() {
	const { testString } = this.test.ctx;
	this.test.ctx.returnValue = getFirstLineFromString(testString);
}

export function getDataFromFileIsCalledWithThePath() {
	const { filePath } = this.test.ctx;
	const returnValue = getDataFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getDataIsCalled() {
	const { argData, sourceData, stdInData } = this.test.ctx;
	const returnValue = getData(argData, sourceData, stdInData);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function deAliasIsCalledOnTheType() {
	const { type } = this.test.ctx;
	const returnValue = deAlias(type);
	this.test.ctx.returnValue = returnValue;
}

export function shouldUseJsonOutputIsCalledWithTheConfigAndOptions() {
	const { config, options } = this.test.ctx;
	const returnValue = shouldUseJsonOutput(config, options);
	this.test.ctx.returnValue = returnValue;
}

export function createErrorHandlerIsCalledWithThePrefix() {
	const { prefix } = this.test.ctx;
	const returnValue = createErrorHandler(prefix);
	this.test.ctx.returnValue = returnValue;
}

export function theReturnedFunctionIsCalledWithTheObject() {
	const { returnValue, testObject } = this.test.ctx;
	this.test.ctx.returnValue = returnValue(testObject);
}
