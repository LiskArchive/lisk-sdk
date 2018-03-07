/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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
import query from '../../../src/utils/query';

export function theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithASuccessfulArrayDataResponse() {
	const { liskAPIInstance, endpoint, parameters, options } = this.test.ctx;

	const queryResult = {
		data: [{ some: 'value' }],
	};
	liskAPIInstance[endpoint].get.resolves(queryResult);
	this.test.ctx.queryResult = queryResult;

	const returnValue = query(endpoint, parameters, options);
	this.test.ctx.returnValue = returnValue;

	return returnValue.catch(e => e);
}

export function theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithASuccessfulObjectDataResponse() {
	const { liskAPIInstance, endpoint, parameters, options } = this.test.ctx;

	const queryResult = {
		data: { message: 'value' },
	};
	liskAPIInstance[endpoint].get.resolves(queryResult);
	this.test.ctx.queryResult = queryResult;

	const returnValue = query(endpoint, parameters, options);
	this.test.ctx.returnValue = returnValue;

	return returnValue.catch(e => e);
}

export function theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithAFailedResponse() {
	const { liskAPIInstance, endpoint, parameters, options } = this.test.ctx;

	const queryResult = {
		message: 'request failed',
	};
	liskAPIInstance[endpoint].get.resolves(queryResult);
	this.test.ctx.queryResult = queryResult;

	const returnValue = query(endpoint, parameters, options);
	this.test.ctx.returnValue = returnValue;

	return returnValue.catch(e => e);
}

export function theQueryInstanceSendsARequestAndTheLiskAPIInstanceResolvesWithASuccessfulEmptyArrayDataResponse() {
	const { liskAPIInstance, endpoint, parameters, options } = this.test.ctx;

	const queryResult = {
		data: [],
	};
	liskAPIInstance[endpoint].get.resolves(queryResult);
	this.test.ctx.queryResult = queryResult;

	const returnValue = query(endpoint, parameters, options);
	this.test.ctx.returnValue = returnValue;

	return returnValue.catch(e => e);
}
