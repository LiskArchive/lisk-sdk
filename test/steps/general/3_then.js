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
import { getFirstQuotedString, getFirstNumber } from '../utils';
import { ValidationError, FileSystemError } from '../../../src/utils/error';

export function theErrorShouldBeAnInstanceOfNodesBuiltInError() {
	const { testError } = this.test.ctx;
	return expect(testError).to.be.instanceOf(Error);
}

export function theErrorShouldHaveTheName() {
	const { testError: { name } } = this.test.ctx;
	const errorName = getFirstQuotedString(this.test.title);
	return expect(name).to.equal(errorName);
}

export function itShouldThrowValidationError() {
	const { testFunction } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return expect(testFunction)
		.to.throw()
		.and.be.customError(new ValidationError(message));
}

export function itShouldThrowFileSystemError() {
	const { testFunction } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return expect(testFunction)
		.to.throw()
		.and.be.customError(new FileSystemError(message));
}

export function itShouldThrowTypeError() {
	const { testFunction } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return expect(testFunction).to.throw(TypeError, message);
}

export function itShouldExitWithCode() {
	const { exit } = this.test.ctx;
	const code = getFirstNumber(this.test.title);
	return expect(exit).to.be.calledWithExactly(code);
}

export function itShouldResolveToAnObject() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.eventually.be.an('object');
}

export function itShouldResolveToTheErrorObject() {
	const { returnValue, errorObject } = this.test.ctx;
	return expect(returnValue).to.eventually.eql(errorObject);
}

export async function itShouldResolveToAnObjectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	const result = await returnValue;
	return expect(result)
		.to.have.property('message')
		.equal(message);
}

export async function itShouldResolveToAnObjectWithWarning() {
	const { returnValue } = this.test.ctx;
	const warning = getFirstQuotedString(this.test.title);
	const result = await returnValue;
	return expect(result)
		.to.have.property('warning')
		.equal(warning);
}

export function theProcessShouldExitWithErrorCode() {
	const errorCode = parseInt(getFirstQuotedString(this.test.title), 10);
	return expect(process.exit).to.be.calledWithExactly(errorCode);
}

export function itShouldRejectWithTheErrorMessage() {
	const { returnValue, errorMessage } = this.test.ctx;
	return expect(returnValue).to.be.rejectedWith(errorMessage);
}

export function itShouldRejectWithErrorAndMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return expect(returnValue).to.be.rejectedWith(message);
}

export function itShouldRejectWithFileSystemErrorAndMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return expect(returnValue).to.be.rejected.then(err =>
		expect(err).to.be.customError(new FileSystemError(message)),
	);
}

export function itShouldRejectWithValidationErrorAndMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return expect(returnValue).to.be.rejected.then(err =>
		expect(err).to.be.customError(new ValidationError(message)),
	);
}

export function itShouldRejectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return expect(returnValue).to.be.rejectedWith(message);
}

export function itShouldReturnAnEmptyObject() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.eventually.eql({});
}

export function itShouldReturnTrue() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.be.true;
}

export function itShouldReturnFalse() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.be.false;
}

export function itShouldReturnNull() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.be.null;
}

export function itShouldReturnString() {
	const { returnValue } = this.test.ctx;
	const expectedString = getFirstQuotedString(this.test.title);

	return expect(returnValue).to.equal(expectedString);
}

export function itShouldResolveToTheOptions() {
	const { options, returnValue } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(options);
}

export function itShouldResolveToTheDataAsAString() {
	const { returnValue, data } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(data);
}

export function itShouldReturnAnObjectWithError() {
	const { returnValue } = this.test.ctx;
	const error = getFirstQuotedString(this.test.title);
	return expect(returnValue).to.eql({
		error,
	});
}

export function itShouldResolveToTheWarrantyInformation() {
	const { returnValue, warranty } = this.test.ctx;
	return expect(returnValue).to.eventually.eql({ warranty });
}

export function itShouldResolveToTheCopyrightInformation() {
	const { returnValue, copyright } = this.test.ctx;
	return expect(returnValue).to.eventually.eql({ copyright });
}
