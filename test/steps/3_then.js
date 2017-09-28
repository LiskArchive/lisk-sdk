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
import tablify from '../../src/utils/tablify';

export function thenTheLiskInstanceShouldBeALiskJSApiInstance() {
	const { liskInstance } = this.test.ctx;
	(liskInstance).should.be.instanceOf(lisk.api);
}

export function thenTheResultShouldBeReturned() {
	const { returnValue, result } = this.test.ctx;
	(returnValue).should.equal(result);
}

export function thenATableShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const tableOutput = tablify(result).toString();
	(vorpal.activeCommand.log.calledWithExactly(tableOutput)).should.be.true();
}

export function thenJSONOutputShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const jsonOutput = JSON.stringify(result);
	(vorpal.activeCommand.log.calledWithExactly(jsonOutput)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID() {
	const { blockId, liskInstance } = this.test.ctx;
	const route = 'blocks/get';
	const options = { id: blockId };
	(liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress() {
	const { address, liskInstance } = this.test.ctx;
	const route = 'accounts';
	const options = { address };
	(liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID() {
	const { transactionId, liskInstance } = this.test.ctx;
	const route = 'transactions/get';
	const options = { id: transactionId };
	(liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername() {
	const { delegateUsername, liskInstance } = this.test.ctx;
	const route = 'delegates/get';
	const options = { username: delegateUsername };
	(liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenFsReadFileSyncShouldBeCalledWithThePathAndEncoding() {
	const { path } = this.test.ctx;
	(fs.readFileSync.calledWithExactly(path, 'utf8')).should.be.true();
}

export function thenJSONParseShouldBeCalledWithTheFileContentsAsAString() {
	const { fileContents } = this.test.ctx;
	(JSON.parse.calledWithExactly(fileContents)).should.be.true();
}

export function thenJSONParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM() {
	const { fileContents } = this.test.ctx;
	(JSON.parse.calledWithExactly(fileContents.slice(1))).should.be.true();
}

export function thenTheParsedFileContentsShouldBeReturned() {
	const { returnValue, parsedFileContents } = this.test.ctx;
	(returnValue).should.equal(parsedFileContents);
}

export function thenJSONStringifyShouldBeCalledWithTheObjectUsingTabIndentation() {
	const { objectToWrite } = this.test.ctx;
	const tab = '\t';
	(JSON.stringify.calledWithExactly(objectToWrite, null, tab)).should.be.true();
}

export function thenFsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON() {
	const { path, stringifiedObject } = this.test.ctx;
	(fs.writeFileSync.calledWithExactly(path, stringifiedObject)).should.be.true();
}

export function thenTheReturnedTableShouldHaveNoHead() {
	const { returnValue } = this.test.ctx;
	(returnValue.options).should.have.property('head').eql([]);
}

export function thenTheReturnedTableShouldHaveNoRows() {
	const { returnValue } = this.test.ctx;
	(returnValue).should.have.length(0);
}

export function thenTheReturnedTableShouldHaveAHeadWithTheObjectKeys() {
	const { returnValue, testObject } = this.test.ctx;
	const keys = Object.keys(testObject);
	(returnValue.options).should.have.property('head').eql(keys);
}

export function thenTheReturnedTableShouldHaveARowWithTheObjectValues() {
	const { returnValue, testObject } = this.test.ctx;
	const values = Object.values(testObject);
	(returnValue[0]).should.eql(values);
}

export function thenTheReturnedTableShouldHaveAHeadWithTheObjectsKeys() {
	const { returnValue, testArray } = this.test.ctx;
	const keys = Object.keys(testArray[0]);
	(returnValue.options).should.have.property('head').eql(keys);
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
	(returnValue.options).should.have.property('head').eql(uniqueKeys);
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
