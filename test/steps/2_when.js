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
import lisk from 'lisk-js';
import {
	readJsonSync,
	writeJsonSync,
} from '../../src/utils/fs';
import { printResult } from '../../src/utils/print';
import tablify from '../../src/utils/tablify';

const DEFAULT_ERROR_MESSAGE = 'Cannot read property \'length\' of null';

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
	const { path } = this.test.ctx;
	this.test.ctx.returnValue = readJsonSync(path);
}

export function whenTheJSONIsWritten() {
	const { path, objectToWrite } = this.test.ctx;
	this.test.ctx.returnValue = writeJsonSync(path, objectToWrite);
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
