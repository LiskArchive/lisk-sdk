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
import liskInstance from '../../src/utils/liskInstance';
import queryInstance from '../../src/utils/query';
import { getFirstQuotedString } from './utils';

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
	this.test.ctx.path = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.fileContents = '{\n\t"lisk": "js",\n\t"version": 1\n}';
	this.test.ctx.parsedFileContents = {
		lisk: 'js',
		version: 1,
	};
	sandbox.stub(JSON, 'parse').returns(this.test.ctx.parsedFileContents);
	sandbox.stub(fs, 'readFileSync').returns(this.test.ctx.fileContents);
}

export function givenTheFileHasABOM() {
	const BOM = '\uFEFF';
	this.test.ctx.fileContents = `${BOM}${this.test.ctx.fileContents}`;
	fs.readFileSync.returns(this.test.ctx.fileContents);
}

export function givenThereIsAnObjectThatShouldBeWrittenToPath() {
	this.test.ctx.path = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.objectToWrite = {
		lisk: 'js',
		version: 1,
	};
	this.test.ctx.stringifiedObject = '{\n\t"lisk": "js",\n\t"version": 1\n}';
	sandbox.stub(JSON, 'stringify').returns(this.test.ctx.stringifiedObject);
	sandbox.stub(fs, 'writeFileSync');
}
