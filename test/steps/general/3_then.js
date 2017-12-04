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
	getFirstQuotedString,
	getFirstNumber,
} from '../utils';
import { ValidationError } from '../../../src/utils/error';

export function theErrorShouldBeInstanceOfNodesBuiltInError() {
	const { testError } = this.test.ctx;
	return (testError).should.be.instanceOf(Error);
}

export function theErrorShouldHaveTheName() {
	const { testError: { name } } = this.test.ctx;
	const errorName = getFirstQuotedString(this.test.title);
	return (name).should.be.equal(errorName);
}

export function itShouldReturnTheResult() {
	const { returnValue, result } = this.test.ctx;
	return (returnValue).should.equal(result);
}

export function itShouldThrowValidationError() {
	const { testFunction } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (testFunction).should.throw(new ValidationError(message));
}

export function itShouldThrowError() {
	const { testFunction } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (testFunction).should.throw(message);
}

export function itShouldExitWithCode() {
	const { exit } = this.test.ctx;
	const code = getFirstNumber(this.test.title);
	return (exit).should.be.calledWithExactly(code);
}

export function itShouldResolveToTheObject() {
	const { returnValue, testObject } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(testObject);
}

export async function itShouldResolveToAnObjectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	const result = await returnValue;
	return (result).should.have.property('message').equal(message);
}

export async function itShouldResolveToAnObjectWithWarning() {
	const { returnValue } = this.test.ctx;
	const warning = getFirstQuotedString(this.test.title);
	const result = await returnValue;
	return (result).should.have.property('warning').equal(warning);
}

export function theProcessShouldExitWithErrorCode() {
	const errorCode = parseInt(getFirstQuotedString(this.test.title), 10);
	return (process.exit).should.be.calledWithExactly(errorCode);
}

export function itShouldRejectWithTheErrorMessage() {
	const { returnValue, errorMessage } = this.test.ctx;
	return (returnValue).should.be.rejectedWith(errorMessage);
}

export function itShouldRejectWithValidationErrorAndMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (returnValue).should.be.rejectedWith(new ValidationError(message));
}

export function itShouldRejectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (returnValue).should.be.rejectedWith(message);
}

export function itShouldReturnAnEmptyObject() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({});
}

export function itShouldReturnTrue() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.true();
}

export function itShouldReturnFalse() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.false();
}

export function itShouldReturnNull() {
	const { returnValue } = this.test.ctx;
	return should(returnValue).be.null();
}

export function itShouldReturnString() {
	const { returnValue } = this.test.ctx;
	const expectedString = getFirstQuotedString(this.test.title);

	return (returnValue).should.equal(expectedString);
}

export function itShouldResolveToTheDataAsAString() {
	const { returnValue, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(data);
}

export function itShouldReturnAnObjectWithError() {
	const { returnValue } = this.test.ctx;
	const error = getFirstQuotedString(this.test.title);
	return (returnValue).should.eql({
		error,
	});
}

export function itShouldResolveToTheWarrantyInformation() {
	const { returnValue, warranty } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({ warranty });
}

export function itShouldResolveToTheCopyrightInformation() {
	const { returnValue, copyright } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({ copyright });
}
