/*
 * LiskHQ/lisk-commander
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
import { FileSystemError } from '../../../src/utils/error';
import * as fsUtils from '../../../src/utils/fs';
import {
	getFirstQuotedString,
	createFakeInterface,
	createStreamStub,
} from '../utils';

export function aFilePath() {
	const filePath = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.filePath = filePath;
}

export function theConfigFileCanBeWritten() {}

export function thereIsAFileWithUtf8EncodedJSONContentsAtPath() {
	const fileContents = '{\n\t"lisk": "js",\n\t"version": 1\n}';
	const parsedFileContents = {
		lisk: 'js',
		version: 1,
	};

	JSON.parse.returns(parsedFileContents);
	fs.readFileSync.returns(fileContents);

	this.test.ctx.filePath = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.fileContents = fileContents;
	this.test.ctx.parsedFileContents = parsedFileContents;
}

export function theFileHasABOM() {
	const BOM = '\uFEFF';
	const fileContents = `${BOM}${this.test.ctx.fileContents}`;

	fs.readFileSync.returns(fileContents);

	this.test.ctx.fileContents = fileContents;
}

export function thereIsAnObjectThatShouldBeWrittenToPath() {
	const objectToWrite = {
		lisk: 'js',
		version: 1,
	};
	const stringifiedObject = '{\n\t"lisk": "js",\n\t"version": 1\n}';

	JSON.stringify.returns(stringifiedObject);

	this.test.ctx.filePath = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.objectToWrite = objectToWrite;
	this.test.ctx.stringifiedObject = stringifiedObject;
}

export function aDirectoryPath() {
	this.test.ctx.directoryPath = getFirstQuotedString(this.test.parent.title);
}

export function aConfigFileName() {
	const { directoryPath } = this.test.ctx;
	const configFileName = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.configFileName = configFileName;
	this.test.ctx.filePath = `${directoryPath}/${configFileName}`;
}

export function theDirectoryDoesNotExist() {
	const { directoryPath } = this.test.ctx;
	fs.existsSync.withArgs(directoryPath).returns(false);
	fsUtils.readJSONSync.throws('Cannot read file');
}

export function theDirectoryDoesExist() {
	const { directoryPath } = this.test.ctx;
	fs.existsSync.withArgs(directoryPath).returns(true);
}

export function theDirectoryCannotBeCreated() {
	fs.mkdirSync.throws('Cannot make directory');
}

export function theDirectoryCanBeCreated() {}

export function theFileDoesNotExist() {
	const { filePath } = this.test.ctx;
	const error = new Error('ENOENT: no such file or directory');
	const streamStub = createStreamStub(
		(type, callback) => type === 'error' && callback(error),
	);

	fs.existsSync.withArgs(filePath).returns(false);
	fs.readFileSync.throws(error);
	fs.createReadStream.returns(streamStub);
	fsUtils.readJSONSync.throws('Cannot read file');
}

export function theFileDoesExist() {
	const { filePath } = this.test.ctx;
	fs.existsSync.withArgs(filePath).returns(true);
}

export function theFileCannotBeWritten() {
	fsUtils.writeJSONSync.throws('Cannot write to file');
}

export function theFileCanBeWritten() {}

export function theFileCannotBeRead() {
	const { filePath } = this.test.ctx;
	const error = new FileSystemError('EACCES: permission denied');
	const streamStub = createStreamStub(
		(type, callback) => type === 'error' && callback(error),
	);

	fs.accessSync
		.withArgs(filePath, fs.constants.R_OK)
		.throws('Cannot read file');
	fs.readFileSync.throws(error);
	fs.createReadStream.returns(streamStub);
	fsUtils.readJSONSync.throws('Cannot read file');
}

export function theFileCanBeRead() {
	const { fileContents } = this.test.ctx;
	const streamStub = createStreamStub(
		(type, callback) =>
			// istanbul ignore next
			type === 'data' && setImmediate(() => callback(fileContents)),
	);

	if (typeof readline.createInterface.returns === 'function') {
		readline.createInterface.returns(createFakeInterface(fileContents));
	}
	fs.createReadStream.returns(streamStub);
	fs.readFileSync.returns(fileContents);
}

export function anUnknownErrorOccursWhenReadingTheFile() {
	const errorMessage = getFirstQuotedString(this.test.parent.title);
	const error = new Error(errorMessage);
	const streamStub = createStreamStub(
		(type, callback) => type === 'error' && callback(error),
	);

	fs.createReadStream.returns(streamStub);
	fs.readFileSync.throws(error);
}

export function theFileAtTheFilePathHasContents() {
	const { filePath } = this.test.ctx;
	const contents = getFirstQuotedString(this.test.parent.title);

	fs.readFileSync.withArgs(filePath).returns(contents);
}

export function theFileIsNotValidJSON() {
	fsUtils.readJSONSync.throws('Invalid JSON');
}

export function theFileIsMissingRequiredKeys() {
	const userConfig = {
		name: 'custom-name',
		json: true,
	};

	this.test.ctx.userConfig = userConfig;

	fsUtils.readJSONSync.returns(userConfig);
}

export function theFileIsValid() {
	const userConfig = {
		name: 'custom-name',
		json: true,
		api: {
			network: 'beta',
			nodes: ['http://localhost:4000'],
		},
	};

	this.test.ctx.userConfig = userConfig;

	fsUtils.readJSONSync.returns(userConfig);
}
