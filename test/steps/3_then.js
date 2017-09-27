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
import tablify from '../../src/utils/tablify';

export function thenTheLiskInstanceShouldBeALiskJSApiInstance() {
	(this.test.ctx.liskInstance).should.be.instanceOf(lisk.api);
}

export function thenTheResultShouldBeReturned() {
	(this.test.ctx.returnValue).should.equal(this.test.ctx.result);
}

export function thenATableShouldBeLogged() {
	const tableOutput = tablify(this.test.ctx.result).toString();
	(this.test.ctx.vorpal.activeCommand.log.calledWithExactly(tableOutput)).should.be.true();
}

export function thenJSONOutputShouldBeLogged() {
	const jsonOutput = JSON.stringify(this.test.ctx.result);
	(this.test.ctx.vorpal.activeCommand.log.calledWithExactly(jsonOutput)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID() {
	const route = 'blocks/get';
	const options = { id: this.test.ctx.blockId };
	(this.test.ctx.liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress() {
	const route = 'accounts';
	const options = { address: this.test.ctx.address };
	(this.test.ctx.liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID() {
	const route = 'transactions/get';
	const options = { id: this.test.ctx.transactionId };
	(this.test.ctx.liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}

export function thenTheLiskInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername() {
	const route = 'delegates/get';
	const options = { username: this.test.ctx.delegateUsername };
	(this.test.ctx.liskInstance.sendRequest.calledWithExactly(route, options)).should.be.true();
}
