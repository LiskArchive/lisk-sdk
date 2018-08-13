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
import { createErrorHandler } from '../../../src/utils/helpers';

export function createErrorHandlerIsCalledWithThePrefix() {
	const { prefix } = this.test.ctx;
	const returnValue = createErrorHandler(prefix);
	this.test.ctx.returnValue = returnValue;
}

export function theReturnedFunctionIsCalledWithTheObject() {
	const { returnValue, testObject } = this.test.ctx;
	this.test.ctx.returnValue = returnValue(testObject);
}

export function theFileSystemErrorIsThrown() {
	const { fileSystemErrorFn } = this.test.ctx;
	try {
		const returnValue = fileSystemErrorFn();
		// istanbul ignore next
		this.test.ctx.returnValue = returnValue;
		// istanbul ignore next
		return returnValue;
	} catch (error) {
		const testFunction = fileSystemErrorFn.bind(null);
		this.test.ctx.testFunction = testFunction;
		this.test.ctx.testError = error;
		return testFunction;
	}
}

export function theValidationErrorIsThrown() {
	const { validationErrorFn } = this.test.ctx;
	try {
		const returnValue = validationErrorFn();
		// istanbul ignore next
		this.test.ctx.returnValue = returnValue;
		// istanbul ignore next
		return returnValue;
	} catch (error) {
		const testFunction = validationErrorFn.bind(null);
		this.test.ctx.testFunction = testFunction;
		this.test.ctx.testError = error;
		return testFunction;
	}
}
