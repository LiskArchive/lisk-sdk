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
import lockfile from 'lockfile';
import * as fsUtils from '../../../src/utils/fs';

export function fsReadFileSyncShouldBeCalledWithThePathAndEncoding() {
	const { filePath } = this.test.ctx;
	return expect(fs.readFileSync).to.be.calledWithExactly(filePath, 'utf8');
}

export function jsonParseShouldBeCalledWithTheFileContentsAsAString() {
	const { fileContents } = this.test.ctx;
	return expect(JSON.parse).to.be.calledWithExactly(fileContents);
}

export function jsonParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM() {
	const { fileContents } = this.test.ctx;
	return expect(JSON.parse).to.be.calledWithExactly(fileContents.slice(1));
}

export function theParsedFileContentsShouldBeReturned() {
	const { returnValue, parsedFileContents } = this.test.ctx;
	return expect(returnValue).to.equal(parsedFileContents);
}

export function jsonStringifyShouldBeCalledWithTheObjectUsingTabIndentation() {
	const { objectToWrite } = this.test.ctx;
	const tab = '\t';
	return expect(JSON.stringify).to.be.calledWithExactly(
		objectToWrite,
		null,
		tab,
	);
}

export function fsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON() {
	const { filePath, stringifiedObject } = this.test.ctx;
	return expect(fs.writeFileSync).to.be.calledWithExactly(
		filePath,
		stringifiedObject,
	);
}

export function theDefaultConfigShouldBeWrittenToTheConfigFile() {
	const { filePath, defaultConfig } = this.test.ctx;
	return expect(fsUtils.writeJSONSync).to.be.calledWithExactly(
		filePath,
		defaultConfig,
	);
}

export function theConfigFileShouldNotBeWritten() {
	return expect(fsUtils.writeJSONSync).not.to.be.called;
}

export function itShouldResolveToTheFirstLineOfTheFile() {
	const { returnValue, passphrase } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(passphrase);
}

export function itShouldLockTheFile() {
	return expect(lockfile.lockSync).to.be.called;
}

export function itShouldUnlockTheFile() {
	return expect(lockfile.unlockSync).to.be.called;
}
