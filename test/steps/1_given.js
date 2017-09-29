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
import readline from 'readline';
import lisk from 'lisk-js';
import defaultConfig from '../../defaultConfig.json';
import cryptoInstance from '../../src/utils/cryptoModule';
import * as fsUtils from '../../src/utils/fs';
import liskInstance from '../../src/utils/liskInstance';
import queryInstance from '../../src/utils/query';
import {
	getFirstQuotedString,
	getQuotedStrings,
	createFakeInterface,
	createStreamStub,
} from './utils';

export function givenThereIsAVorpalInstanceWithAnActiveCommandThatCanLog() {
	this.test.ctx.vorpal = {
		activeCommand: {
			log: sandbox.spy(),
		},
	};
}

export function givenAVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt() {
	const { passphrase } = this.test.ctx;
	this.test.ctx.vorpal = {
		ui: {},
		activeCommand: {
			prompt: sandbox.stub().onFirstCall().resolves({ passphrase }),
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

	this.test.ctx.filePath = getFirstQuotedString(this.test.parent.title);
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

	this.test.ctx.filePath = getFirstQuotedString(this.test.parent.title);
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

export function givenAPassphrase() {
	this.test.ctx.passphrase = getFirstQuotedString(this.test.parent.title);
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

export function givenADefaultConfig() {
	this.test.ctx.defaultConfig = defaultConfig;
}

export function givenADirectoryPath() {
	this.test.ctx.directoryPath = getFirstQuotedString(this.test.parent.title);
}

export function givenAConfigFileName() {
	const { directoryPath } = this.test.ctx;
	const configFileName = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.configFileName = configFileName;
	this.test.ctx.filePath = `${directoryPath}/${configFileName}`;
}

export function givenTheDirectoryDoesNotExist() {
	const { directoryPath } = this.test.ctx;
	fs.existsSync.withArgs(directoryPath).returns(false);
	fsUtils.readJsonSync.throws('Cannot read file');
}

export function givenTheDirectoryDoesExist() {
	const { directoryPath } = this.test.ctx;
	fs.existsSync.withArgs(directoryPath).returns(true);
}

export function givenTheDirectoryCannotBeCreated() {
	fs.mkdirSync.throws('Cannot make directory');
}

export function givenTheDirectoryCanBeCreated() {}

export function givenTheFileDoesNotExist() {
	const { filePath } = this.test.ctx;
	const error = new Error('ENOENT: no such file or directory');
	const streamStub = createStreamStub((type, callback) => type === 'error' && callback(error));

	fs.existsSync.withArgs(filePath).returns(false);
	fs.readFileSync.throws(error);
	fs.createReadStream.returns(streamStub);
	fsUtils.readJsonSync.throws('Cannot read file');
}

export function givenTheFileDoesExist() {
	const { filePath } = this.test.ctx;
	fs.existsSync.withArgs(filePath).returns(true);
}

export function givenTheFileCannotBeWritten() {
	fsUtils.writeJsonSync.throws('Cannot write to file');
}

export function givenTheFileCanBeWritten() {}

export function givenTheFileCannotBeRead() {
	const { filePath } = this.test.ctx;
	const error = new Error('EACCES: permission denied');
	const streamStub = createStreamStub((type, callback) => type === 'error' && callback(error));

	fs.accessSync.withArgs(filePath, fs.constants.R_OK).throws('Cannot read file');
	fs.readFileSync.throws(error);
	fs.createReadStream.returns(streamStub);
	fsUtils.readJsonSync.throws('Cannot read file');
}

export function givenTheFileCanBeRead() {
	const { fileContents } = this.test.ctx;
	const streamStub = createStreamStub((type, callback) => type === 'data' && setImmediate(() => callback(fileContents)));

	fs.createReadStream.returns(streamStub);
	fs.readFileSync.returns(fileContents);
}

export function givenAnUnknownErrorOccursWhenReadingTheFile() {
	const errorMessage = getFirstQuotedString(this.test.parent.title);
	const error = new Error(errorMessage);
	const streamStub = createStreamStub((type, callback) => type === 'error' && callback(error));

	fs.createReadStream.returns(streamStub);
	fs.readFileSync.throws(error);
}

export function givenTheFileIsNotValidJSON() {
	fsUtils.readJsonSync.throws('Invalid JSON');
}

export function givenTheFileIsValidJSON() {
	const userConfig = {
		name: 'custom-name',
		json: true,
		liskJS: {
			testnet: true,
			node: 'my-node',
			port: 7357,
			ssl: true,
		},
	};

	this.test.ctx.userConfig = userConfig;

	fsUtils.readJsonSync.returns(userConfig);
}

export function givenASourceWithoutDelimiter() {
	this.test.ctx.source = getFirstQuotedString(this.test.parent.title);
}

export function givenASourceWithDelimiter() {
	this.test.ctx.source = getFirstQuotedString(this.test.parent.title);
}

export function givenAPromptMessage() {
	this.test.ctx.promptMessage = getFirstQuotedString(this.test.parent.title);
}

export function givenAPromptDisplayName() {
	this.test.ctx.displayName = getFirstQuotedString(this.test.parent.title);
}

export function givenThePassphraseIsProvidedViaThePrompt() {
	const { passphrase } = this.test.ctx;
	this.test.ctx.vorpal.activeCommand.prompt.resolves({ passphrase });
}

export function givenThePassphraseShouldNotBeRepeated() {
	this.test.ctx.shouldRepeat = false;
}

export function givenThePassphraseShouldBeRepeated() {
	this.test.ctx.shouldRepeat = true;
}

export function givenTheVorpalInstanceHasNoUIParent() {
	const { vorpal } = this.test.ctx;
	delete vorpal.ui.parent;
}

export function givenTheVorpalInstanceHasAUIParent() {
	const { vorpal } = this.test.ctx;
	const parent = { existing: 'parent' };

	this.test.ctx.vorpalUIParent = parent;
	vorpal.ui.parent = parent;
}

export function givenThePassphraseIsNotSuccessfullyRepeated() {
	const { vorpal, passphrase } = this.test.ctx;
	vorpal.activeCommand.prompt.onSecondCall().resolves({
		passphrase: `${passphrase.slice(0, -1)}y`,
	});
}

export function givenThePassphraseIsSuccessfullyRepeated() {
	const { vorpal, passphrase } = this.test.ctx;
	vorpal.activeCommand.prompt.onSecondCall().resolves({ passphrase });
}

export function givenSomeData() {
	this.test.ctx.data = getFirstQuotedString(this.test.parent.title);
}

export function givenNeitherThePassphraseNorTheDataIsProvidedViaStdIn() {
	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(''));
}

export function givenThePassphraseIsProvidedViaStdIn() {
	const { passphrase } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(passphrase));

	this.test.ctx.passphraseIsRequired = true;
}

export function givenTheDataIsProvidedViaStdIn() {
	const { data } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(data));

	this.test.ctx.dataIsRequired = true;
}

export function givenBothThePassphraseAndTheDataAreProvidedViaStdIn() {
	const { passphrase, data } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(`${passphrase}\n${data}`));

	this.test.ctx.passphraseIsRequired = true;
	this.test.ctx.dataIsRequired = true;
}

export function givenThePassphraseIsStoredInEnvironmentalVariable() {
	const { passphrase } = this.test.ctx;
	const environmentalVariableName = getFirstQuotedString(this.test.parent.title);

	process.env[environmentalVariableName] = passphrase;

	this.test.ctx.environmentalVariableName = environmentalVariableName;
	this.test.ctx.passphraseSource = `env:${environmentalVariableName}`;
}

export function givenEnvironmentalVariableIsNotSet() {
	const environmentalVariableName = getFirstQuotedString(this.test.parent.title);

	delete process.env[environmentalVariableName];

	this.test.ctx.environmentalVariableName = environmentalVariableName;
}

export function givenAPassphraseFilePath() {
	const { passphrase } = this.test.ctx;
	const filePath = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.fileContents = `${passphrase}\nSome irrelevant text\non subsequent lines\n`;
	this.test.ctx.filePath = filePath;
	this.test.ctx.passphraseSource = `file:${filePath}`;
}

export function givenAnUnknownPassphraseSource() {
	this.test.ctx.passphraseSource = 'unknownSource';
}

export function givenThePassphraseIsProvidedAsPlaintext() {
	const { passphrase } = this.test.ctx;
	this.test.ctx.passphraseSource = `pass:${passphrase}`;
}

export function givenThereIsNoStringAvailable() {
	this.test.ctx.testString = null;
}

export function givenThereIsAString() {
	this.test.ctx.testString = getFirstQuotedString(this.test.parent.title);
}

export function givenADataFilePath() {
	const { data } = this.test.ctx;
	const filePath = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.fileContents = data;
	this.test.ctx.filePath = filePath;
}

export function givenNoDataIsProvided() {}

export function givenDataIsProvidedViaStdIn() {
	const { data } = this.test.ctx;
	this.test.ctx.stdInData = data;
}

export function givenDataIsProvidedAsAnArgument() {
	const { data } = this.test.ctx;
	this.test.ctx.argData = data;
}

export function givenDataIsProvidedViaAnUnknownSource() {
	this.test.ctx.sourceData = 'unknownSource';
}

export function givenDataIsProvidedViaAFileSource() {
	const { filePath } = this.test.ctx;
	this.test.ctx.sourceData = `file:${filePath}`;
}
