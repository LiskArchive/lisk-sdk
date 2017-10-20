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
import * as fsUtils from '../../src/utils/fs';
import { shouldUseJsonOutput } from '../../src/utils/helpers';
import * as input from '../../src/utils/input';
import commonOptions from '../../src/utils/options';
import tablify from '../../src/utils/tablify';
import {
	getCommandInstance,
	getFirstQuotedString,
	getFirstBoolean,
} from './utils';


export function theLiskTransactionObjectShouldHaveTransactionCreationFunctions() {
	const { createLiskTransaction } = this.test.ctx;
	return (createLiskTransaction).should.have.keys('createTransaction', 'signTransaction', 'createMultisignature', 'createSignature', 'createDelegate', 'createVote');
}


export function itShouldGetTheDataUsingTheMessageFromStdIn() {
	const { message } = this.test.ctx;
	const firstCallArgs = input.getData.firstCall.args;
	return (firstCallArgs[2]).should.equal(message);
}

export function itShouldGetTheDataUsingTheMessageArgument() {
	const { message } = this.test.ctx;
	return (input.getData).should.be.calledWith(message);
}

export function itShouldGetTheDataUsingTheMessageSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = input.getData.firstCall.args;
	return (firstCallArgs[1]).should.equal(options.message);
}

export function itShouldGetThePassphraseUsingThePassphraseFromStdIn() {
	const { passphrase } = this.test.ctx;
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[2]).should.equal(passphrase);
}

export function itShouldGetThePassphraseUsingThePassphraseSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[1]).should.equal(options.passphrase);
}

export function itShouldGetThePassphraseWithASinglePrompt() {
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[3] === undefined || !firstCallArgs[3].shouldRepeat).should.be.true();
}

export function itShouldGetThePassphraseWithARepeatedPrompt() {
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[3]).should.eql({ shouldRepeat: true });
}

export function itShouldGetThePassphraseUsingTheVorpalInstance() {
	const { vorpal } = this.test.ctx;
	return (input.getPassphrase).should.be.calledWith(vorpal);
}

export function itShouldNotGetThePassphraseFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('passphraseIsRequired').equal(false);
}

export function itShouldGetThePassphraseFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('passphraseIsRequired').equal(true);
}

export function itShouldNotGetTheMessageFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(false);
}

export function itShouldGetTheMessageFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(true);
}

export function itShouldDecryptTheMessageUsingTheNonceThePassphraseAndTheSenderPublicKey() {
	const { message, nonce, passphrase, senderPublicKey } = this.test.ctx;
	return (cryptoInstance.decryptMessage).should.be.calledWithExactly(message, nonce, passphrase, senderPublicKey);
}

export function itShouldResolveToTheResultOfDecryptingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(cryptoResult);
}

export function itShouldEncryptTheMessageWithThePassphraseForTheRecipient() {
	const { message, passphrase, recipient } = this.test.ctx;
	return (cryptoInstance.encryptMessage).should.be.calledWithExactly(message, passphrase, recipient);
}

export function itShouldResolveToTheResultOfEncryptingTheMessage() {
	const { returnValue, cryptoResult } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(cryptoResult);
}

export function itShouldWriteTheUpdatedConfigToTheConfigFile() {
	const { filePath, config } = this.test.ctx;
	return (fsUtils.writeJsonSync).should.be.calledWithExactly(filePath, config);
}

export function itShouldUpdateTheConfigVariableToTheValue() {
	const { config, value } = this.test.ctx;
	const variable = getFirstQuotedString(this.test.title);
	return (config).should.have.property(variable).equal(value);
}

export function itShouldUpdateTheConfigNestedVariableToBoolean() {
	const { config } = this.test.ctx;
	const nestedVariable = getFirstQuotedString(this.test.title).split('.');
	const boolean = getFirstBoolean(this.test.title);
	const value = nestedVariable.reduce((currentObject, nextKey) => currentObject[nextKey], config);
	return (value).should.equal(boolean);
}

export function itShouldUpdateTheConfigVariableToBoolean() {
	const { config } = this.test.ctx;
	const variable = getFirstQuotedString(this.test.title);
	const boolean = getFirstBoolean(this.test.title);
	return (config).should.have.property(variable).equal(boolean);
}

export function theVorpalCommandInstanceShouldHaveTheAutocompleteList() {
	const { vorpal, command, autocompleteList } = this.test.ctx;
	const { _autocomplete } = getCommandInstance(vorpal, command);
	return (_autocomplete).should.be.equal(autocompleteList);
}

export function theVorpalCommandInstanceShouldHaveTheDescription() {
	const { vorpal, command, description } = this.test.ctx;
	const { _description } = getCommandInstance(vorpal, command);
	return (_description).should.be.equal(description);
}

export function theVorpalCommandInstanceShouldHaveTheProvidedOptions() {
	const { vorpal, command, optionsList } = this.test.ctx;
	const { options } = getCommandInstance(vorpal, command);
	return optionsList.forEach(myOption => (options).should.matchAny(option => option.flags === `${myOption[0]}`));
}

export function theVorpalCommandInstanceShouldHaveTheJsonOption() {
	const { vorpal, command } = this.test.ctx;
	const { options } = getCommandInstance(vorpal, command);
	return (options).should.matchAny(option => option.flags === commonOptions.json[0]);
}

export function theVorpalCommandInstanceShouldHaveTheNoJsonOption() {
	const { vorpal, command } = this.test.ctx;
	const { options } = getCommandInstance(vorpal, command);
	return (options).should.matchAny(option => option.flags === commonOptions.noJson[0]);
}

export function theVorpalInstanceShouldHaveTheCommand() {
	const { vorpal, command } = this.test.ctx;
	const commandInstance = getCommandInstance(vorpal, command);
	return (commandInstance).should.be.ok();
}

export function theErrorShouldBePrintedWithThePrefix() {
	const { printFunction, errorMessage, prefix } = this.test.ctx;
	return (printFunction).should.be.calledWithExactly({
		error: `${prefix}: ${errorMessage}`,
	});
}

export function theObjectShouldBePrinted() {
	const { printFunction, testObject } = this.test.ctx;
	return (printFunction).should.be.calledWithExactly(testObject);
}

export function itShouldResolveToTheResultOfTheQuery() {
	const { returnValue, queryResult } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(queryResult);
}

export function itShouldResolveToAnArrayOfQueryResults() {
	const { returnValue, inputs, queryResult } = this.test.ctx;
	const arrayOfQueryResults = inputs.map(() => queryResult);
	return (returnValue).should.be.fulfilledWith(arrayOfQueryResults);
}

export function itShouldResolveToTheConfig() {
	const { returnValue, config } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(config);
}

export function itShouldResolveToTheObject() {
	const { returnValue, testObject } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(testObject);
}

export function itShouldResolveToAnObjectWithThePassphraseAndThePublicKeyAndTheAddress() {
	const { returnValue, passphrase, keys: { publicKey }, address } = this.test.ctx;
	const expectedObject = {
		passphrase,
		publicKey,
		address,
	};
	return (returnValue).should.be.fulfilledWith(expectedObject);
}

export async function itShouldResolveToAnObjectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	const result = await returnValue;
	return (result).should.have.property('message').equal(message);
}

export async function itShouldResolveToAnObjectWithWarning() {
	const { returnValue } = this.test.ctx;
	const warning = getFirstQuotedString(this.test.title);
	const result = await returnValue;
	return (result).should.have.property('warning').equal(warning);
}

export function theMnemonicPassphraseShouldBeA12WordString() {
	const { mnemonicPassphrase } = this.test.ctx;
	const mnemonicWords = mnemonicPassphrase.split(' ').filter(Boolean);
	return (mnemonicWords).should.have.length(12);
}

export function liskJSCryptoShouldBeUsedToGetTheAddressFromThePublicKey() {
	const { keys: { publicKey } } = this.test.ctx;
	return (lisk.crypto.getAddressFromPublicKey).should.be.calledWithExactly(publicKey);
}

export function itShouldReturnAnObjectWithTheAddress() {
	const { returnValue, address } = this.test.ctx;
	return (returnValue).should.eql({ address });
}

export function theLiskInstanceShouldBeALiskJSApiInstance() {
	const { liskInstance } = this.test.ctx;
	return (liskInstance).should.be.instanceOf(lisk.api);
}

export function theResultShouldBeReturned() {
	const { returnValue, result } = this.test.ctx;
	return (returnValue).should.equal(result);
}

export function aTableShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const tableOutput = tablify(result).toString();
	return (vorpal.activeCommand.log).should.be.calledWithExactly(tableOutput);
}

export function jSONOutputShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const jsonOutput = JSON.stringify(result);
	return (vorpal.activeCommand.log).should.be.calledWithExactly(jsonOutput);
}

export function theLiskInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID() {
	const { blockId, liskInstance } = this.test.ctx;
	const route = 'blocks/get';
	const options = { id: blockId };
	return (liskInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theLiskInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress() {
	const { address, liskInstance } = this.test.ctx;
	const route = 'accounts';
	const options = { address };
	return (liskInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theLiskInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID() {
	const { transactionId, liskInstance } = this.test.ctx;
	const route = 'transactions/get';
	const options = { id: transactionId };
	return (liskInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theLiskInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername() {
	const { delegateUsername, liskInstance } = this.test.ctx;
	const route = 'delegates/get';
	const options = { username: delegateUsername };
	return (liskInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function fsReadFileSyncShouldBeCalledWithThePathAndEncoding() {
	const { filePath } = this.test.ctx;
	return (fs.readFileSync).should.be.calledWithExactly(filePath, 'utf8');
}

export function jSONParseShouldBeCalledWithTheFileContentsAsAString() {
	const { fileContents } = this.test.ctx;
	return (JSON.parse).should.be.calledWithExactly(fileContents);
}

export function jSONParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM() {
	const { fileContents } = this.test.ctx;
	return (JSON.parse).should.be.calledWithExactly(fileContents.slice(1));
}

export function theParsedFileContentsShouldBeReturned() {
	const { returnValue, parsedFileContents } = this.test.ctx;
	return (returnValue).should.equal(parsedFileContents);
}

export function jSONStringifyShouldBeCalledWithTheObjectUsingTabIndentation() {
	const { objectToWrite } = this.test.ctx;
	const tab = '\t';
	return (JSON.stringify).should.be.calledWithExactly(objectToWrite, null, tab);
}

export function fsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON() {
	const { filePath, stringifiedObject } = this.test.ctx;
	return (fs.writeFileSync).should.be.calledWithExactly(filePath, stringifiedObject);
}

export function shouldUseJsonOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject() {
	const { config } = this.test.ctx;
	return (shouldUseJsonOutput).should.be.calledWithExactly(config, {});
}

export function shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions() {
	const { config, options } = this.test.ctx;
	return (shouldUseJsonOutput).should.be.calledWithExactly(config, options);
}

export function theReturnedTableShouldHaveNoHead() {
	const { returnValue } = this.test.ctx;
	return (returnValue.options).should.have.property('head').eql([]);
}

export function theReturnedTableShouldHaveNoRows() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.have.length(0);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectKeys() {
	const { returnValue, testObject } = this.test.ctx;
	const keys = Object.keys(testObject);
	return (returnValue.options).should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveARowWithTheObjectValues() {
	const { returnValue, testObject } = this.test.ctx;
	const values = Object.values(testObject);
	return (returnValue[0]).should.eql(values);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectNestedKeys() {
	const { returnValue } = this.test.ctx;
	const keys = ['root', 'nested.object', 'nested.testing', 'nested.nullValue'];
	return (returnValue.options).should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectNestedValues() {
	const { returnValue } = this.test.ctx;
	const values = ['value', 'values', 123, null];
	return (returnValue[0]).should.eql(values);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectsKeys() {
	const { returnValue, testArray } = this.test.ctx;
	const keys = Object.keys(testArray[0]);
	return (returnValue.options).should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectValues() {
	const { returnValue, testArray } = this.test.ctx;
	return testArray.forEach((testObject, i) => {
		const values = Object.values(testObject);
		return (returnValue[i]).should.eql(values);
	});
}

export function theReturnedTableShouldHaveAHeadWithEveryUniqueKey() {
	const { returnValue, testArray } = this.test.ctx;
	const uniqueKeys = testArray
		.reduce((keys, testObject) => {
			const newKeys = Object.keys(testObject).filter(key => !keys.includes(key));
			return [...keys, ...newKeys];
		}, []);
	return (returnValue.options).should.have.property('head').eql(uniqueKeys);
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues() {
	const { returnValue, testArray } = this.test.ctx;
	return testArray.forEach((testObject, i) => {
		const row = returnValue[i];
		const values = Object.values(testObject);

		values.forEach(value => (row).should.containEql(value));
		return row
			.filter(value => !values.includes(value))
			.forEach(value => should(value).be.undefined());
	});
}

export function theCryptoInstanceShouldHaveName() {
	const { cryptoInstance: crypto } = this.test.ctx;
	const name = getFirstQuotedString(this.test.title);
	return (crypto.constructor).should.have.property('name').equal(name);
}

export function theCryptoInstanceShouldHaveLiskJSAsAProperty() {
	const { cryptoInstance: crypto } = this.test.ctx;
	return (crypto).should.have.property('liskCrypto').equal(lisk.crypto);
}

export function liskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase() {
	const { passphrase } = this.test.ctx;
	return (lisk.crypto.getKeys).should.be.calledWithExactly(passphrase);
}

export function theKeysShouldBeReturned() {
	const { returnValue, keys } = this.test.ctx;
	return (returnValue).should.eql(keys);
}

export function theErrorResponseShouldBeHandled() {
	const { returnValue, errorMessage } = this.test.ctx;
	return (returnValue).should.eql({ error: errorMessage });
}

export function liskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV() {
	const { passphrase, password } = this.test.ctx;
	return (lisk.crypto.encryptPassphraseWithPassword).should.be.calledWithExactly(passphrase, password);
}

export function theEncryptedPassphraseAndIVShouldBeReturned() {
	const { returnValue, cipherAndIv } = this.test.ctx;
	return (returnValue).should.eql(cipherAndIv);
}

export function liskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase() {
	const { cipherAndIv, password } = this.test.ctx;
	return (lisk.crypto.decryptPassphraseWithPassword).should.be.calledWithExactly(cipherAndIv, password);
}

export function theDecryptedPassphraseShouldBeReturned() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.eql({ passphrase });
}

export function liskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce() {
	const { message, passphrase, recipientKeys } = this.test.ctx;
	return (lisk.crypto.encryptMessageWithSecret).should.be.calledWithExactly(message, passphrase, recipientKeys.publicKey);
}

export function theEncryptedMessageAndNonceShouldBeReturned() {
	const { returnValue, encryptedMessageWithNonce } = this.test.ctx;
	return (returnValue).should.eql(encryptedMessageWithNonce);
}

export function liskJSCryptoShouldBeUsedToGetTheDecryptedMessage() {
	const { encryptedMessageWithNonce: { encryptedMessage, nonce }, recipientPassphrase, keys } = this.test.ctx;
	return (lisk.crypto.decryptMessageWithSecret).should.be.calledWithExactly(encryptedMessage, nonce, recipientPassphrase, keys.publicKey);
}

export function theDecryptedMessageShouldBeReturned() {
	const { returnValue, message } = this.test.ctx;
	return (returnValue).should.eql({ message });
}

export function theDefaultConfigShouldBeExported() {
	const { config, defaultConfig } = this.test.ctx;
	return (config).should.eql(defaultConfig);
}

export function theUsersConfigShouldBeExported() {
	const { config, userConfig } = this.test.ctx;
	return (config).should.eql(userConfig);
}

export function theDefaultConfigShouldBeWrittenToTheConfigFile() {
	const { filePath, defaultConfig } = this.test.ctx;
	return (fsUtils.writeJsonSync).should.be.calledWithExactly(filePath, defaultConfig);
}

export function theConfigFileShouldNotBeWritten() {
	return (fsUtils.writeJsonSync).should.not.be.called();
}

export function theUserShouldBeWarnedThatTheConfigWillNotBePersisted() {
	return (console.warn).should.be.calledWithMatch(/Your configuration will not be persisted\./);
}

export function theUserShouldBeInformedThatTheConfigFilePermissionsAreIncorrect() {
	const { filePath } = this.test.ctx;
	return (console.error).should.be.calledWithExactly(`Could not read config file. Please check permissions for ${filePath} or delete the file so we can create a new one from defaults.`);
}

export function theUserShouldBeInformedThatTheConfigFileIsNotValidJSON() {
	const { filePath } = this.test.ctx;
	return (console.error).should.be.calledWithExactly(`Config file is not valid JSON. Please check ${filePath} or delete the file so we can create a new one from defaults.`);
}

export function theProcessShouldExitWithErrorCode() {
	const errorCode = parseInt(getFirstQuotedString(this.test.title), 10);
	return (process.exit).should.be.calledWithExactly(errorCode);
}

export function theResultShouldHaveSourceType() {
	const { returnValue } = this.test.ctx;
	const sourceType = getFirstQuotedString(this.test.title);
	return (returnValue).should.have.property('sourceType').equal(sourceType);
}

export function theResultShouldHaveAnEmptySourceIdentifier() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.have.property('sourceIdentifier').equal('');
}

export function theResultShouldHaveSourceIdentifier() {
	const { returnValue } = this.test.ctx;
	const sourceIdentifier = getFirstQuotedString(this.test.title);
	return (returnValue).should.have.property('sourceIdentifier').equal(sourceIdentifier);
}

export function anOptionsObjectWithTheMessageShouldBeReturned() {
	const { returnValue, promptMessage } = this.test.ctx;
	return (returnValue).should.eql({
		type: 'password',
		name: 'passphrase',
		message: promptMessage,
	});
}

export function aUIParentShouldBeSet() {
	const { vorpal } = this.test.ctx;
	return (vorpal.ui.parent).should.equal(vorpal);
}

export function theUIParentShouldBeMaintained() {
	const { vorpal, vorpalUIParent } = this.test.ctx;
	return (vorpal.ui.parent).should.equal(vorpalUIParent);
}

export function itShouldPromptForThePassphraseOnce() {
	const { vorpal } = this.test.ctx;
	return (vorpal.activeCommand.prompt).should.be.calledOnce();
}

export function itShouldPromptForThePassphraseTwice() {
	const { vorpal } = this.test.ctx;
	return (vorpal.activeCommand.prompt).should.be.calledTwice();
}

export function itShouldUseOptionsWithTheMessage() {
	const { vorpal } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (vorpal.activeCommand.prompt).should.be.calledWithExactly({
		type: 'password',
		name: 'passphrase',
		message,
	});
}

export function itShouldResolveToThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(passphrase);
}

export function itShouldRejectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (returnValue).should.be.rejectedWith(message);
}

export function itShouldReturnAnEmptyObject() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({});
}

export function itShouldReturnAnObjectWithThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase,
	});
}

export function itShouldReturnAnObjectWithTheData() {
	const { returnValue, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase: null,
		data,
	});
}

export function itShouldReturnAnObjectWithThePassphraseAndTheData() {
	const { returnValue, passphrase, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase,
		data,
	});
}

export function itShouldResolveToTheFirstLineOfTheFile() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(passphrase);
}

export function itShouldReturnTrue() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.true();
}

export function itShouldReturnFalse() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.false();
}

export function itShouldReturnNull() {
	const { returnValue } = this.test.ctx;
	return should(returnValue).be.null();
}

export function itShouldReturnString() {
	const { returnValue } = this.test.ctx;
	const expectedString = getFirstQuotedString(this.test.title);

	return (returnValue).should.equal(expectedString);
}

export function itShouldResolveToTheDataAsAString() {
	const { returnValue, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(data);
}

export function itShouldReturnTheAlias() {
	const { returnValue, alias } = this.test.ctx;
	return (returnValue).should.be.equal(alias);
}

export function itShouldReturnTheType() {
	const { returnValue, type } = this.test.ctx;
	return (returnValue).should.be.equal(type);
}

export function itShouldReturnAnObjectWithError() {
	const { returnValue } = this.test.ctx;
	const error = getFirstQuotedString(this.test.title);
	return (returnValue).should.eql({
		error,
	});
}
