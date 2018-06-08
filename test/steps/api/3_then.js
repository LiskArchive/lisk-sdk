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
import elements from 'lisk-elements';
import getAPIClient from '../../../src/utils/api';
import { getFirstQuotedString } from '../utils';

export function itShouldUseTheLiskAPIInstanceToSendARequestToTheEndpointUsingTheParameters() {
	const { liskAPIInstance, endpoint, parameters } = this.test.ctx;
	return expect(liskAPIInstance[endpoint].get).to.be.calledWithExactly(
		parameters,
	);
}

export function itShouldNotBroadcastTheSignature() {
	const { liskAPIInstance } = this.test.ctx;
	return expect(liskAPIInstance.signatures.broadcast).not.to.be.called;
}

export function itShouldBroadcastTheSignature() {
	const { liskAPIInstance, signature } = this.test.ctx;
	return expect(liskAPIInstance.signatures.broadcast).to.be.calledWithExactly(
		JSON.parse(signature),
	);
}

export function itShouldNotBroadcastTheTransaction() {
	const { liskAPIInstance } = this.test.ctx;
	return expect(liskAPIInstance.transactions.broadcast).not.to.be.called;
}

export function itShouldBroadcastTheTransaction() {
	const { liskAPIInstance, transaction } = this.test.ctx;
	return expect(liskAPIInstance.transactions.broadcast).to.be.calledWithExactly(
		JSON.parse(transaction),
	);
}

export function itShouldResolveToTheAPIResponse() {
	const { returnValue, apiResponse } = this.test.ctx;
	return expect(returnValue).to.eventually.eql(apiResponse);
}

export function theLiskAPIInstanceShouldBeALiskElementsAPIInstance() {
	const { liskAPIInstance } = this.test.ctx;
	return expect(liskAPIInstance).to.be.instanceOf(elements.APIClient);
}

export function theGetAPIClientShouldBeCalled() {
	return expect(getAPIClient).to.be.called;
}

export function theLiskAPIInstanceShouldHaveNethashEqualTo() {
	const { liskAPIInstance } = this.test.ctx;
	const nethash = getFirstQuotedString(this.test.title);
	return expect(liskAPIInstance.headers.nethash).to.equal(nethash);
}

export function theLiskAPIInstanceShouldHaveCurrentNodeEqualTo() {
	const { liskAPIInstance } = this.test.ctx;
	const node = getFirstQuotedString(this.test.title);
	return expect(liskAPIInstance.currentNode).to.equal(node);
}

export function itShouldResolveToAnObjectWhichIncludesTheNodeStatus() {
	const { nodeStatus, returnValue } = this.test.ctx;
	return returnValue.then(res => {
		Object.entries(nodeStatus).forEach(([key, value]) => {
			expect(res).to.have.property(key);
			expect(res[key]).to.equal(value);
		});
	});
}

export function itShouldResolveToAnObjectWhichIncludesTheNodeConstants() {
	const { nodeConstants, returnValue } = this.test.ctx;
	return returnValue.then(res => {
		Object.entries(nodeConstants).forEach(([key, value]) => {
			expect(res).to.have.property(key);
			expect(res[key]).to.equal(value);
		});
	});
}

export function itShouldResolveToAnObjectWhichHaveKeyEqualTo() {
	const { returnValue } = this.test.ctx;
	const key = getFirstQuotedString(this.test.title);
	return expect(returnValue)
		.to.eventually.be.an('object')
		.and.have.property(key);
}

export function itShouldResolveToAnObjectWhichDoesNotHaveKeyEqualTo() {
	const { returnValue } = this.test.ctx;
	const key = getFirstQuotedString(this.test.title);
	return expect(returnValue)
		.to.eventually.be.an('object')
		.and.not.have.property(key);
}
