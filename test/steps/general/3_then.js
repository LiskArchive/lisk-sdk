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
import { getFirstQuotedString, getFirstNumber } from '../utils';
import { ValidationError, FileSystemError } from '../../../src/utils/error';

export function theErrorShouldBeInstanceOfNodesBuiltInError() {
	const { testError } = this.test.ctx;
	return testError.should.be.instanceOf(Error);
}

export function theErrorShouldHaveTheName() {
	const { testError: { name } } = this.test.ctx;
	const errorName = getFirstQuotedString(this.test.title);
	return name.should.be.equal(errorName);
}

export function itShouldReturnTheResult() {
	const { returnValue, result } = this.test.ctx;
	return returnValue.should.equal(result);
}

export function itShouldThrowValidationError() {
	const { testFunction } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return testFunction.should
		.throw()
		.and.be.customError(new ValidationError(message));
}

export function itShouldThrowFileSystemError() {
	const { testFunction } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return testFunction.should
		.throw()
		.and.be.customError(new FileSystemError(message));
}

export function itShouldExitWithCode() {
	const { exit } = this.test.ctx;
	const code = getFirstNumber(this.test.title);
	return exit.should.be.calledWithExactly(code);
}

export function itShouldResolveToTheErrorObject() {
	const { returnValue, errorObject } = this.test.ctx;
	return returnValue.should.be.eventually.eql(errorObject);
}

export async function itShouldResolveToAnObjectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	const result = await returnValue;
	return result.should.have.property('message').equal(message);
}

export async function itShouldResolveToAnObjectWithWarning() {
	const { returnValue } = this.test.ctx;
	const warning = getFirstQuotedString(this.test.title);
	const result = await returnValue;
	return result.should.have.property('warning').equal(warning);
}

export function theProcessShouldExitWithErrorCode() {
	const errorCode = parseInt(getFirstQuotedString(this.test.title), 10);
	return process.exit.should.be.calledWithExactly(errorCode);
}

export function itShouldRejectWithTheErrorMessage() {
	const { returnValue, errorMessage } = this.test.ctx;
	return returnValue.should.be.rejectedWith(errorMessage);
}

export function itShouldRejectWithFileSystemErrorAndMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return returnValue.should.be.rejected.then(err => {
		return err.should.be.customError(new FileSystemError(message));
	});
}

export function itShouldRejectWithValidationErrorAndMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return returnValue.should.be.rejected.then(err => {
		return err.should.be.customError(new ValidationError(message));
	});
}

export function itShouldRejectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return returnValue.should.be.rejectedWith(message);
}

export function itShouldRejectWithTheOriginalRejection() {
	const { returnValue, rejection } = this.test.ctx;
	return returnValue.should.be.rejectedWith(rejection);
}

export function itShouldReturnAnEmptyObject() {
	const { returnValue } = this.test.ctx;
	return returnValue.should.be.eventually.eql({});
}

export function itShouldReturnTrue() {
	const { returnValue } = this.test.ctx;
	return returnValue.should.be.true;
}

export function itShouldReturnFalse() {
	const { returnValue } = this.test.ctx;
	return returnValue.should.be.false;
}

export function itShouldReturnNull() {
	const { returnValue } = this.test.ctx;
	return should.equal(returnValue, null);
}

export function itShouldReturnString() {
	const { returnValue } = this.test.ctx;
	const expectedString = getFirstQuotedString(this.test.title);

	return returnValue.should.equal(expectedString);
}

export function itShouldResolveToTheOptions() {
	const { options, returnValue } = this.test.ctx;
	return returnValue.should.be.eventually.eql(options);
}

export function itShouldResolveToTheDataAsAString() {
	const { returnValue, data } = this.test.ctx;
	return returnValue.should.be.eventually.eql(data);
}

export function itShouldReturnAnObjectWithError() {
	const { returnValue } = this.test.ctx;
	const error = getFirstQuotedString(this.test.title);
	return returnValue.should.eql({
		error,
	});
}

export function itShouldResolveToTheWarrantyInformation() {
	const { returnValue, warranty } = this.test.ctx;
	return returnValue.should.be.eventually.eql({ warranty });
}

export function itShouldResolveToTheCopyrightInformation() {
	const { returnValue, copyright } = this.test.ctx;
	return returnValue.should.be.eventually.eql({ copyright });
}
