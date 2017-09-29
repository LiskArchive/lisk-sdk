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
import * as fsUtils from '../../src/utils/fs';
import tablify from '../../src/utils/tablify';
import { getFirstQuotedString } from './utils';

export function thenTheLiskInstanceShouldBeALiskJSApiInstance() {
	const { liskInstance } = this.test.ctx;
	return (liskInstance).should.be.instanceOf(lisk.api);
}

export function thenTheResultShouldBeReturned() {
	const { returnValue, result } = this.test.ctx;
	return (returnValue).should.equal(result);
}

export function thenATableShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const tableOutput = tablify(result).toString();
	return (vorpal.activeCommand.log.calledWithExactly(tableOutput)).should.be.true();
}

export function thenJSONOutputShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const jsonOutput = JSON.stringify(result);
	return (vorpal.activeCommand.log.calledWithExactly(jsonOutput)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID() {
	const { blockId, liskInstance } = this.test.ctx;
	const route = 'blocks/get';
	const options = { id: blockId };
	return (liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress() {
	const { address, liskInstance } = this.test.ctx;
	const route = 'accounts';
	const options = { address };
	return (liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID() {
	const { transactionId, liskInstance } = this.test.ctx;
	const route = 'transactions/get';
	const options = { id: transactionId };
	return (liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername() {
	const { delegateUsername, liskInstance } = this.test.ctx;
	const route = 'delegates/get';
	const options = { username: delegateUsername };
	return (liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenFsReadFileSyncShouldBeCalledWithThePathAndEncoding() {
	const { filePath } = this.test.ctx;
	return (fs.readFileSync.calledWithExactly(filePath, 'utf8')).should.be.true();
}

export function thenJSONParseShouldBeCalledWithTheFileContentsAsAString() {
	const { fileContents } = this.test.ctx;
	return (JSON.parse.calledWithExactly(fileContents)).should.be.true();
}

export function thenJSONParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM() {
	const { fileContents } = this.test.ctx;
	return (JSON.parse.calledWithExactly(fileContents.slice(1))).should.be.true();
}

export function thenTheParsedFileContentsShouldBeReturned() {
	const { returnValue, parsedFileContents } = this.test.ctx;
	return (returnValue).should.equal(parsedFileContents);
}

export function thenJSONStringifyShouldBeCalledWithTheObjectUsingTabIndentation() {
	const { objectToWrite } = this.test.ctx;
	const tab = '\t';
	return (JSON.stringify.calledWithExactly(objectToWrite, null, tab)).should.be.true();
}

export function thenFsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON() {
	const { filePath, stringifiedObject } = this.test.ctx;
	return (fs.writeFileSync.calledWithExactly(filePath, stringifiedObject)).should.be.true();
}

export function thenTheReturnedTableShouldHaveNoHead() {
	const { returnValue } = this.test.ctx;
	return (returnValue.options).should.have.property('head').eql([]);
}

export function thenTheReturnedTableShouldHaveNoRows() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.have.length(0);
}

export function thenTheReturnedTableShouldHaveAHeadWithTheObjectKeys() {
	const { returnValue, testObject } = this.test.ctx;
	const keys = Object.keys(testObject);
	return (returnValue.options).should.have.property('head').eql(keys);
}

export function thenTheReturnedTableShouldHaveARowWithTheObjectValues() {
	const { returnValue, testObject } = this.test.ctx;
	const values = Object.values(testObject);
	return (returnValue[0]).should.eql(values);
}

export function thenTheReturnedTableShouldHaveAHeadWithTheObjectsKeys() {
	const { returnValue, testArray } = this.test.ctx;
	const keys = Object.keys(testArray[0]);
	return (returnValue.options).should.have.property('head').eql(keys);
}

export function thenTheReturnedTableShouldHaveARowForEachObjectWithTheObjectValues() {
	const { returnValue, testArray } = this.test.ctx;
	testArray.forEach((testObject, i) => {
		const values = Object.values(testObject);
		(returnValue[i]).should.eql(values);
	});
}

export function thenTheReturnedTableShouldHaveAHeadWithEveryUniqueKey() {
	const { returnValue, testArray } = this.test.ctx;
	const uniqueKeys = testArray
		.reduce((keys, testObject) => {
			const newKeys = Object.keys(testObject).filter(key => !keys.includes(key));
			return [...keys, ...newKeys];
		}, []);
	return (returnValue.options).should.have.property('head').eql(uniqueKeys);
}

export function thenTheReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues() {
	const { returnValue, testArray } = this.test.ctx;
	testArray.forEach((testObject, i) => {
		const row = returnValue[i];
		const values = Object.values(testObject);

		values.forEach(value => (row).should.containEql(value));
		row
			.filter(value => !values.includes(value))
			.forEach(value => should(value).be.undefined());
	});
}

export function thenTheCryptoInstanceShouldHaveName() {
	const { cryptoInstance } = this.test.ctx;
	const name = getFirstQuotedString(this.test.title);
	return (cryptoInstance.constructor).should.have.property('name').equal(name);
}

export function thenTheCryptoInstanceShouldHaveLiskJSAsAProperty() {
	const { cryptoInstance } = this.test.ctx;
	return (cryptoInstance).should.have.property('liskCrypto').equal(lisk.crypto);
}

export function thenLiskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase() {
	const { passphrase } = this.test.ctx;
	return (lisk.crypto.getKeys.calledWithExactly(passphrase)).should.be.true();
}

export function thenTheKeysShouldBeReturned() {
	const { returnValue, keys } = this.test.ctx;
	return (returnValue).should.eql(keys);
}

export function thenTheErrorResponseShouldBeHandled() {
	const { returnValue, errorMessage } = this.test.ctx;
	return (returnValue).should.eql({ error: errorMessage });
}

export function thenLiskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV() {
	const { passphrase, password } = this.test.ctx;
	return (lisk.crypto.encryptPassphraseWithPassword.calledWithExactly(passphrase, password)).should.be.true();
}

export function thenTheEncryptedPassphraseAndIVShouldBeReturned() {
	const { returnValue, cipherAndIv } = this.test.ctx;
	return (returnValue).should.eql(cipherAndIv);
}

export function thenLiskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase() {
	const { cipherAndIv, password } = this.test.ctx;
	return (lisk.crypto.decryptPassphraseWithPassword.calledWithExactly(cipherAndIv, password)).should.be.true();
}

export function thenTheDecryptedPassphraseShouldBeReturned() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.eql({ passphrase });
}

export function thenLiskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce() {
	const { message, passphrase, recipientKeys } = this.test.ctx;
	return (lisk.crypto.encryptMessageWithSecret.calledWithExactly(message, passphrase, recipientKeys.publicKey)).should.be.true();
}

export function thenTheEncryptedMessageAndNonceShouldBeReturned() {
	const { returnValue, encryptedMessageWithNonce } = this.test.ctx;
	return (returnValue).should.eql(encryptedMessageWithNonce);
}

export function thenLiskJSCryptoShouldBeUsedToGetTheDecryptedMessage() {
	const { encryptedMessageWithNonce: { encryptedMessage, nonce }, recipientPassphrase, keys } = this.test.ctx;
	return (lisk.crypto.decryptMessageWithSecret.calledWithExactly(encryptedMessage, nonce, recipientPassphrase, keys.publicKey)).should.be.true();
}

export function thenTheDecryptedMessageShouldBeReturned() {
	const { returnValue, message } = this.test.ctx;
	return (returnValue).should.eql({ message });
}

export function thenTheDefaultConfigShouldBeExported() {
	const { config, defaultConfig } = this.test.ctx;
	return (config).should.eql(defaultConfig);
}

export function thenTheUsersConfigShouldBeExported() {
	const { config, userConfig } = this.test.ctx;
	return (config).should.eql(userConfig);
}

export function thenTheDefaultConfigShouldBeWrittenToTheConfigFile() {
	const { filePath, defaultConfig } = this.test.ctx;
	return (fsUtils.writeJsonSync.calledWithExactly(filePath, defaultConfig)).should.be.true();
}

export function thenTheConfigFileShouldNotBeWritten() {
	return (fsUtils.writeJsonSync.called).should.be.false();
}

export function thenTheUserShouldBeWarnedThatTheConfigWillNotBePersisted() {
	return (console.warn.calledWithMatch(/Your configuration will not be persisted\./)).should.be.true();
}

export function thenTheUserShouldBeInformedThatTheConfigFilePermissionsAreIncorrect() {
	const { filePath } = this.test.ctx;
	return (console.error.calledWithExactly(`Could not read config file. Please check permissions for ${filePath} or delete the file so we can create a new one from defaults.`))
		.should.be.true();
}

export function thenTheUserShouldBeInformedThatTheConfigFileIsNotValidJSON() {
	const { filePath } = this.test.ctx;
	return (console.error.calledWithExactly(`Config file is not valid JSON. Please check ${filePath} or delete the file so we can create a new one from defaults.`))
		.should.be.true();
}

export function thenTheProcessShouldExitWithErrorCode() {
	const errorCode = parseInt(getFirstQuotedString(this.test.title), 10);
	return (process.exit.calledWithExactly(errorCode)).should.be.true();
}

export function thenTheResultShouldHaveSourceType() {
	const { returnValue } = this.test.ctx;
	const sourceType = getFirstQuotedString(this.test.title);
	return (returnValue).should.have.property('sourceType').equal(sourceType);
}

export function thenTheResultShouldHaveAnEmptySourceIdentifier() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.have.property('sourceIdentifier').equal('');
}

export function thenTheResultShouldHaveSourceIdentifier() {
	const { returnValue } = this.test.ctx;
	const sourceIdentifier = getFirstQuotedString(this.test.title);
	return (returnValue).should.have.property('sourceIdentifier').equal(sourceIdentifier);
}

export function thenAnOptionsObjectWithTheMessageShouldBeReturned() {
	const { returnValue, promptMessage } = this.test.ctx;
	return (returnValue).should.eql({
		type: 'password',
		name: 'passphrase',
		message: promptMessage,
	});
}

export function thenAUIParentShouldBeSet() {
	const { vorpal } = this.test.ctx;
	return (vorpal.ui.parent).should.equal(vorpal);
}

export function thenTheUIParentShouldBeMaintained() {
	const { vorpal, vorpalUIParent } = this.test.ctx;
	return (vorpal.ui.parent).should.equal(vorpalUIParent);
}

export function thenItShouldPromptForThePassphraseOnce() {
	const { vorpal } = this.test.ctx;
	return (vorpal.activeCommand.prompt.calledOnce).should.be.true();
}

export function thenItShouldPromptForThePassphraseTwice() {
	const { vorpal } = this.test.ctx;
	return (vorpal.activeCommand.prompt.calledTwice).should.be.true();
}

export function thenItShouldUseOptionsWithTheMessage() {
	const { vorpal } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (vorpal.activeCommand.prompt.calledWithExactly({
		type: 'password',
		name: 'passphrase',
		message,
	})).should.be.true();
}

export function thenItShouldResolveToThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(passphrase);
}

export function thenItShouldRejectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (returnValue).should.be.rejectedWith(message);
}

export function thenItShouldReturnAnEmptyObject() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({});
}

export function thenItShouldReturnAnObjectWithThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase,
	});
}

export function thenItShouldReturnAnObjectWithTheData() {
	const { returnValue, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase: null,
		data,
	});
}

export function thenItShouldReturnAnObjectWithThePassphraseAndTheData() {
	const { returnValue, passphrase, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase,
		data,
	});
}

export function thenItShouldResolveToTheFirstLineOfTheFile() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(passphrase);
}

export function thenItShouldReturnNull() {
	const { returnValue } = this.test.ctx;
	return should(returnValue).be.null();
}

export function thenItShouldReturnString() {
	const { returnValue } = this.test.ctx;
	const expectedString = getFirstQuotedString(this.test.title);

	return (returnValue).should.equal(expectedString);
}

export function thenItShouldResolveToTheDataAsAString() {
	const { returnValue, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(data);
}
