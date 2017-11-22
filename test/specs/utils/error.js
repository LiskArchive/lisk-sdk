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
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('Custom Error Message', () => {
	Given('a function that throws a validation error "could not be validated"', given.aFunctionThatThrowsAValidationError, () => {
		When('the validation error is thrown', when.validationErrorIsThrown, () => {
			Then('it should print the error message in red', then.itShouldPrintTheErrorMessageInRed);
			Then('the error should have the name "ValidationError"', then.theErrorShouldHaveTheName);
			Then('the error should be instance of build in error', then.theErrorShouldBeInstanceOfBuildInError);
		});
	});
});
