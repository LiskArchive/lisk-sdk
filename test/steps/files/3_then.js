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
import * as fsUtils from '../../../src/utils/fs';

export function itShouldWriteTheUpdatedConfigToTheConfigFile() {
	const { filePath, config } = this.test.ctx;
	return fsUtils.writeJSONSync.should.be.calledWithExactly(filePath, config);
}

export function fsReadFileSyncShouldBeCalledWithThePathAndEncoding() {
	const { filePath } = this.test.ctx;
	return fs.readFileSync.should.be.calledWithExactly(filePath, 'utf8');
}

export function jsonParseShouldBeCalledWithTheFileContentsAsAString() {
	const { fileContents } = this.test.ctx;
	return JSON.parse.should.be.calledWithExactly(fileContents);
}

export function jsonParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM() {
	const { fileContents } = this.test.ctx;
	return JSON.parse.should.be.calledWithExactly(fileContents.slice(1));
}

export function theParsedFileContentsShouldBeReturned() {
	const { returnValue, parsedFileContents } = this.test.ctx;
	return returnValue.should.equal(parsedFileContents);
}

export function jsonStringifyShouldBeCalledWithTheObjectUsingTabIndentation() {
	const { objectToWrite } = this.test.ctx;
	const tab = '\t';
	return JSON.stringify.should.be.calledWithExactly(objectToWrite, null, tab);
}

export function fsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON() {
	const { filePath, stringifiedObject } = this.test.ctx;
	return fs.writeFileSync.should.be.calledWithExactly(
		filePath,
		stringifiedObject,
	);
}

export function theDefaultConfigShouldBeWrittenToTheConfigFile() {
	const { filePath, defaultConfig } = this.test.ctx;
	return fsUtils.writeJSONSync.should.be.calledWithExactly(
		filePath,
		defaultConfig,
	);
}

export function theConfigFileShouldNotBeWritten() {
	return fsUtils.writeJSONSync.should.not.be.called;
}

export function itShouldResolveToTheFirstLineOfTheFile() {
	const { returnValue, passphrase } = this.test.ctx;
	return returnValue.should.eventually.eql(passphrase);
}
