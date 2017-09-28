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
import cryptoInstance from '../../src/utils/cryptoModule';
import liskInstance from '../../src/utils/liskInstance';
import queryInstance from '../../src/utils/query';
import {
	getFirstQuotedString,
	getQuotedStrings,
} from './utils';

export function givenThereIsAVorpalInstanceWithAnActiveCommandThatCanLog() {
	this.test.ctx.vorpal = {
		activeCommand: {
			log: sandbox.spy(),
		},
	};
}

export function givenThereIsAResultToPrint() {
	this.test.ctx.result = { lisk: 'JS' };
}

export function givenALiskInstance() {
	this.test.ctx.liskInstance = liskInstance;
}

export function givenAQueryInstance() {
	this.test.ctx.queryInstance = queryInstance;
	sandbox.stub(liskInstance, 'sendRequest');
}

export function givenABlockID() {
	this.test.ctx.blockID = getFirstQuotedString(this.test.parent.title);
}

export function givenAnAddress() {
	this.test.ctx.address = getFirstQuotedString(this.test.parent.title);
}

export function givenATransactionID() {
	this.test.ctx.transactionId = getFirstQuotedString(this.test.parent.title);
}

export function givenADelegateUsername() {
	this.test.ctx.delegateUsername = getFirstQuotedString(this.test.parent.title);
}

export function givenThereIsAFileWithUtf8EncodedJSONContentsAtPath() {
	const fileContents = '{\n\t"lisk": "js",\n\t"version": 1\n}';
	const parsedFileContents = {
		lisk: 'js',
		version: 1,
	};

	sandbox.stub(JSON, 'parse').returns(parsedFileContents);
	sandbox.stub(fs, 'readFileSync').returns(fileContents);

	this.test.ctx.path = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.fileContents = fileContents;
	this.test.ctx.parsedFileContents = parsedFileContents;
}

export function givenTheFileHasABOM() {
	const BOM = '\uFEFF';
	const fileContents = `${BOM}${this.test.ctx.fileContents}`;

	fs.readFileSync.returns(fileContents);

	this.test.ctx.fileContents = fileContents;
}

export function givenThereIsAnObjectThatShouldBeWrittenToPath() {
	const objectToWrite = {
		lisk: 'js',
		version: 1,
	};
	const stringifiedObject = '{\n\t"lisk": "js",\n\t"version": 1\n}';

	sandbox.stub(JSON, 'stringify').returns(stringifiedObject);
	sandbox.stub(fs, 'writeFileSync');

	this.test.ctx.path = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.objectToWrite = objectToWrite;
	this.test.ctx.stringifiedObject = stringifiedObject;
}

export function givenAnEmptyObject() {
	this.test.ctx.testObject = {};
}

export function givenANonEmptyObject() {
	this.test.ctx.testObject = {
		lisk: 'js',
		version: 1,
	};
}

export function givenAnArrayOfObjectsWithTheSameKeys() {
	this.test.ctx.testArray = [
		{
			lisk: 'js',
			version: 1,
		},
		{
			lisk: 'ts',
			version: 2,
		},
		{
			lisk: 'jsx',
			version: 3,
		},
	];
}

export function givenAnArrayOfObjectsWithDivergentKeys() {
	this.test.ctx.testArray = [
		{
			lisk: 'js',
			version: 1,
		},
		{
			lisky: 'ts',
			version: 2,
		},
		{
			nano: 'jsx',
			react: true,
		},
	];
}

export function givenACryptoInstance() {
	[
		'getKeys',
		'encryptPassphraseWithPassword',
		'decryptPassphraseWithPassword',
		'encryptMessageWithSecret',
		'decryptMessageWithSecret',
	].forEach(methodName => sandbox.stub(lisk.crypto, methodName));

	this.test.ctx.cryptoInstance = cryptoInstance;
}

export function givenAPassphraseWithPrivateKeyAndPublicKey() {
	const [passphrase, privateKey, publicKey] = getQuotedStrings(this.test.parent.title);
	const keys = {
		privateKey,
		publicKey,
	};

	lisk.crypto.getKeys.returns(keys);
	lisk.crypto.decryptPassphraseWithPassword.returns(passphrase);

	this.test.ctx.passphrase = passphrase;
	this.test.ctx.keys = keys;
}

export function givenAPassword() {
	this.test.ctx.password = getFirstQuotedString(this.test.parent.title);
}

export function givenAnEncryptedPassphraseWithAnIV() {
	const [encryptedPassphrase, iv] = getQuotedStrings(this.test.parent.title);
	const cipherAndIv = {
		cipher: encryptedPassphrase,
		iv,
	};

	lisk.crypto.encryptPassphraseWithPassword.returns(cipherAndIv);

	this.test.ctx.cipherAndIv = cipherAndIv;
}

export function givenAMessage() {
	const message = getFirstQuotedString(this.test.parent.title);

	lisk.crypto.decryptMessageWithSecret.returns(message);

	this.test.ctx.message = message;
}

export function givenARecipientPassphraseWithPrivateKeyAndPublicKey() {
	const [passphrase, privateKey, publicKey] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.recipientPassphrase = passphrase;
	this.test.ctx.recipientKeys = {
		privateKey,
		publicKey,
	};
}

export function givenAnEncryptedMessageWithANonce() {
	const [encryptedMessage, nonce] = getQuotedStrings(this.test.parent.title);
	const encryptedMessageWithNonce = {
		encryptedMessage,
		nonce,
	};

	lisk.crypto.encryptMessageWithSecret.returns(encryptedMessageWithNonce);

	this.test.ctx.encryptedMessageWithNonce = encryptedMessageWithNonce;
}
