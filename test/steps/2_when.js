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

export function whenTheResultIsPrinted() {
	const { vorpal, result } = this.test.ctx;
	this.test.ctx.returnValue = printResult(vorpal)(result);
}

export function whenTheResultIsPrintedWithTheJSONOptionSetToTrue() {
	const { vorpal, result } = this.test.ctx;
	this.test.ctx.returnValue = printResult(vorpal, { json: true })(result);
}

export function whenTheQueryInstanceGetsABlockUsingTheID() {
	const { queryInstance, blockId } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.isBlockQuery(blockId);
}

export function whenTheQueryInstanceGetsAnAccountUsingTheAddress() {
	const { queryInstance, address } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.isAccountQuery(address);
}

export function whenTheQueryInstanceGetsATransactionUsingTheID() {
	const { queryInstance, transactionId } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.isTransactionQuery(transactionId);
}

export function whenTheQueryInstanceGetsADelegateUsingTheUsername() {
	const { queryInstance, delegateUsername } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.isDelegateQuery(delegateUsername);
}

export function whenTheJSONIsRead() {
	const { filePath } = this.test.ctx;
	this.test.ctx.returnValue = readJsonSync(filePath);
}

export function whenTheJSONIsWritten() {
	const { filePath, objectToWrite } = this.test.ctx;
	this.test.ctx.returnValue = writeJsonSync(filePath, objectToWrite);
}

export function whenTheObjectIsTablified() {
	const { testObject } = this.test.ctx;
	this.test.ctx.returnValue = tablify(testObject);
}

export function whenTheArrayIsTablified() {
	const { testArray } = this.test.ctx;
	this.test.ctx.returnValue = tablify(testArray);
}

export function whenNoErrorOccursAttemptingToGetTheKeysForThePassphrase() {
	const { cryptoInstance, passphrase } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.getKeys(passphrase);
}

export function whenAnErrorOccursAttemptingToGetTheKeysForThePassphrase() {
	const { cryptoInstance, passphrase } = this.test.ctx;

	lisk.crypto.getKeys.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.getKeys(passphrase);
}

export function whenNoErrorOccursAttemptingToEncryptThePassphraseWithThePassword() {
	const { cryptoInstance, passphrase, password } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.encryptPassphrase(passphrase, password);
}

export function whenAnErrorOccursAttemptingToEncryptThePassphraseWithThePassword() {
	const { cryptoInstance, passphrase, password } = this.test.ctx;

	lisk.crypto.encryptPassphraseWithPassword.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.encryptPassphrase(passphrase, password);
}

export function whenNoErrorOccursAttemptingToDecryptThePassphraseWithThePassword() {
	const { cryptoInstance, cipherAndIv, password } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.decryptPassphrase(cipherAndIv, password);
}

export function whenAnErrorOccursAttemptingToDecryptThePassphraseWithThePassword() {
	const { cryptoInstance, cipherAndIv, password } = this.test.ctx;

	lisk.crypto.decryptPassphraseWithPassword.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.decryptPassphrase(cipherAndIv, password);
}

export function whenNoErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase() {
	const { cryptoInstance, message, passphrase, recipientKeys } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.encryptMessage(message, passphrase, recipientKeys.publicKey);
}

export function whenAnErrorOccursAttemptingToEncryptTheMessageForTheRecipientUsingThePassphrase() {
	const { cryptoInstance, message, passphrase, recipientKeys } = this.test.ctx;

	lisk.crypto.encryptMessageWithSecret.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.encryptMessage(message, passphrase, recipientKeys.publicKey);
}

export function whenNoErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey() {
	const { cryptoInstance, encryptedMessageWithNonce: { encryptedMessage, nonce }, recipientPassphrase, keys } = this.test.ctx;
	this.test.ctx.returnValue = cryptoInstance.decryptMessage(encryptedMessage, nonce, recipientPassphrase, keys.publicKey);
}

export function whenAnErrorOccursAttemptingToDecryptTheMessageUsingTheRecipientPassphraseAndSenderPublicKey() {
	const { cryptoInstance, encryptedMessageWithNonce: { encryptedMessage, nonce }, recipientPassphrase, keys } = this.test.ctx;

	lisk.crypto.decryptMessageWithSecret.throws(new TypeError(DEFAULT_ERROR_MESSAGE));

	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.returnValue = cryptoInstance.decryptMessage(encryptedMessage, nonce, recipientPassphrase, keys.publicKey);
}

export function whenTheConfigIsLoaded() {
	// IMPORTANT: This is a workaround because Node’s `require` implementation uses `fs.readFileSync`.
	// If this step gets reused in other tests we’ll have to find a better solution.
	const isSpy = fs.readFileSync.restore;
	if (isSpy) fs.readFileSync.restore();

	const envPath = '../../src/utils/env';
	// eslint-disable-next-line global-require, import/no-dynamic-require
	this.test.ctx.config = require(envPath).default;

	if (isSpy) sandbox.stub(fs, 'readFileSync');
}

export function whenTheSourceIsSplit() {
	const { source } = this.test.ctx;
	this.test.ctx.returnValue = splitSource(source);
}

export function whenCreatePromptOptionsIsCalledWithTheMessage() {
	const { promptMessage } = this.test.ctx;
	this.test.ctx.returnValue = createPromptOptions(promptMessage);
}

export function whenGetPassphraseFromPromptIsCalled() {
	const { vorpal, displayName, shouldRepeat } = this.test.ctx;
	const returnValue = getPassphraseFromPrompt(vorpal, { displayName, shouldRepeat });

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetStdInIsCalledWithTheRelevantOptions() {
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

export function whenGetPassphraseFromEnvVariableIsCalled() {
	const { environmentalVariableName, displayName } = this.test.ctx;
	const returnValue = getPassphraseFromEnvVariable(environmentalVariableName, displayName);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetPassphraseFromFileIsCalledOnThePath() {
	const { filePath } = this.test.ctx;
	const returnValue = getPassphraseFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetPassphraseFromFileIsCalledOnThePathAndAnUnknownErrorOccurs() {
	const { filePath } = this.test.ctx;
	const returnValue = getPassphraseFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetPassphraseFromSourceIsCalledWithTheRelevantSource() {
	const { passphraseSource, displayName } = this.test.ctx;
	const returnValue = getPassphraseFromSource(passphraseSource, { displayName });

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetPassphraseIsPassedAPassphraseDirectly() {
	const { passphrase } = this.test.ctx;
	const returnValue = getPassphrase(null, null, passphrase);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetPassphraseIsPassedASourceButNoPassphrase() {
	const { passphraseSource } = this.test.ctx;
	const returnValue = getPassphrase(null, passphraseSource);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetPassphraseIsPassedNeitherASourceNorAPassphrase() {
	const { vorpal } = this.test.ctx;
	const returnValue = getPassphrase(vorpal);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetFirstLineFromStringIsCalledOnTheString() {
	const { testString } = this.test.ctx;
	this.test.ctx.returnValue = getFirstLineFromString(testString);
}

export function whenGetDataFromFileIsCalledWithThePath() {
	const { filePath } = this.test.ctx;
	const returnValue = getDataFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function whenGetDataIsCalled() {
	const { argData, sourceData, stdInData } = this.test.ctx;
	const returnValue = getData(argData, sourceData, stdInData);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}
