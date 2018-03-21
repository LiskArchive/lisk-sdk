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

export function itShouldResolveToTheResultOfSendingTheRequest() {
	const { returnValue, sendRequestResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(sendRequestResult);
}

export function itShouldResolveToAnObject() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.eventually.be.an('object');
}

export function itShouldResolveToAnEmptyObject() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.eventually.be.eql({});
}

export function itShouldResolveToTheDataKeyOfTheResponse() {
	const { returnValue, sendRequestResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(sendRequestResult.data);
}

export function itShouldResolveToTheFirstElementOfDataKeyOfTheResponse() {
	const { returnValue, sendRequestResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(sendRequestResult.data[0]);
}

export function itShouldResolveToTheResultOfTheQuery() {
	const { returnValue, queryResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(queryResult);
}

export function itShouldResolveToAnArrayOfQueryResults() {
	const { returnValue, inputs, queryResult } = this.test.ctx;
	const arrayOfQueryResults = inputs.map(() => queryResult);
	return expect(returnValue).to.eventually.eql(arrayOfQueryResults);
}
