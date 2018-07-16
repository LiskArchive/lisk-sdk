/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
export function itShouldResolveToTheDataOfTheResponse() {
	const { returnValue, queryResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(queryResult.data);
}

export function itShouldResolveToTheFirstElementOfDataOfTheResponse() {
	const { returnValue, queryResult } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(queryResult.data[0]);
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

export function itShouldCallNodeGetConstants() {
	const { liskAPIInstance } = this.test.ctx;
	return expect(liskAPIInstance.node.getConstants).to.be.calledOnce;
}

export function itShouldCallNodeGetStatus() {
	const { liskAPIInstance } = this.test.ctx;
	return expect(liskAPIInstance.node.getStatus).to.be.calledOnce;
}

export function itShouldCallNodeGetForgingStatus() {
	const { liskAPIInstance } = this.test.ctx;
	return expect(liskAPIInstance.node.getForgingStatus).to.be.calledOnce;
}

export function itShouldNotCallNodeGetForgingStatus() {
	const { liskAPIInstance } = this.test.ctx;
	return expect(liskAPIInstance.node.getForgingStatus).not.to.be.called;
}

export function itShouldHaveErrorMessageForForgingStatus() {
	const { returnValue, errorMessage } = this.test.ctx;
	return expect(returnValue)
		.to.eventually.be.an('object')
		.and.have.property('forgingStatus')
		.equal(errorMessage);
}
