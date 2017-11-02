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
import lisk from 'lisk-js';

export function theliskAPIInstanceShouldBeALiskJSApiInstance() {
	const { liskAPIInstance } = this.test.ctx;
	return (liskAPIInstance).should.be.instanceOf(lisk.api);
}

export function theliskAPIInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID() {
	const { blockId, liskAPIInstance } = this.test.ctx;
	const route = 'blocks/get';
	const options = { id: blockId };
	return (liskAPIInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theliskAPIInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress() {
	const { address, liskAPIInstance } = this.test.ctx;
	const route = 'accounts';
	const options = { address };
	return (liskAPIInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theliskAPIInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID() {
	const { transactionId, liskAPIInstance } = this.test.ctx;
	const route = 'transactions/get';
	const options = { id: transactionId };
	return (liskAPIInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theliskAPIInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername() {
	const { delegateUsername, liskAPIInstance } = this.test.ctx;
	const route = 'delegates/get';
	const options = { username: delegateUsername };
	return (liskAPIInstance.sendRequest).should.be.calledWithExactly(route, options);
}
