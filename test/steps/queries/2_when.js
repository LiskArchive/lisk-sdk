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
import {
	processQueryResult,
} from '../../../src/utils/helpers';

export function processQueryResultIsCalledWithTheTypeThenTheResult() {
	const { type, result } = this.test.ctx;
	const returnValue = processQueryResult(type)(result);
	this.test.ctx.returnValue = returnValue;
}

export function theQueryInstanceGetsABlockUsingTheID() {
	const { queryInstance, blockId } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.getBlock(blockId);
}

export function theQueryInstanceGetsAnAccountUsingTheAddress() {
	const { queryInstance, address } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.getAccount(address);
}

export function theQueryInstanceGetsATransactionUsingTheID() {
	const { queryInstance, transactionId } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.getTransaction(transactionId);
}

export function theQueryInstanceGetsADelegateUsingTheUsername() {
	const { queryInstance, delegateUsername } = this.test.ctx;
	this.test.ctx.returnValue = queryInstance.getDelegate(delegateUsername);
}
