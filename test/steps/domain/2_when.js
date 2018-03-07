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
import {
	deAlias,
	normalizeAmount,
	validateAddress,
	validateAmount,
	validateLifetime,
	validateMinimum,
	validatePublicKeys,
} from '../../../src/utils/helpers';

export function validatePublicKeysIsCalledWithThePublicKeys() {
	const { publicKeys } = this.test.ctx;
	try {
		const returnValue = validatePublicKeys(publicKeys);
		this.test.ctx.returnValue = returnValue;
		return returnValue;
	} catch (error) {
		const testFunction = validatePublicKeys.bind(null, publicKeys);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function validateLifetimeIsCalledOnTheLifetime() {
	const { lifetime } = this.test.ctx;
	try {
		const returnValue = validateLifetime(lifetime);
		this.test.ctx.returnValue = returnValue;
		return returnValue;
	} catch (error) {
		const testFunction = validateLifetime.bind(null, lifetime);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function validateMinimumIsCalledOnTheMinimum() {
	const { minimum } = this.test.ctx;
	try {
		const returnValue = validateMinimum(minimum);
		this.test.ctx.returnValue = returnValue;
		return returnValue;
	} catch (error) {
		const testFunction = validateMinimum.bind(null, minimum);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function validateAmountIsCalledOnTheAmount() {
	const { amount } = this.test.ctx;
	try {
		const returnValue = validateAmount(amount);
		this.test.ctx.returnValue = returnValue;
		return returnValue;
	} catch (error) {
		const testFunction = validateAmount.bind(null, amount);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function normalizeAmountIsCalledOnTheAmount() {
	const { amount } = this.test.ctx;
	try {
		const returnValue = normalizeAmount(amount);
		this.test.ctx.returnValue = returnValue;
		return returnValue;
	} catch (error) {
		const testFunction = normalizeAmount.bind(null, amount);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function deAliasIsCalledOnTheType() {
	const { type } = this.test.ctx;
	const returnValue = deAlias(type);
	this.test.ctx.returnValue = returnValue;
}

export function validateAddressIsCalledOnTheAddress() {
	const { address } = this.test.ctx;
	try {
		const returnValue = validateAddress(address);
		this.test.ctx.returnValue = returnValue;
		return returnValue;
	} catch (error) {
		const testFunction = validateAddress.bind(null, address);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}
