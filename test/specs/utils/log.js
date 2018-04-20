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
import { setUpUtilLog } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('log utils', () => {
	beforeEach(setUpUtilLog);
	describe('logWarning', () => {
		Given(
			'string arguments "Something to be warned about" and "Something else"',
			given.stringArguments,
			() => {
				When(
					'logWarning is called with the arguments',
					when.logWarningIsCalledWithTheArguments,
					() => {
						Then(
							'console.warn should be called with the strings in yellow',
							then.consoleWarnShouldBeCalledWithTheStringsInYellow,
						);
					},
				);
			},
		);
		Given(
			'string arguments "This has %s substitution", "a string" and "Something else"',
			given.stringArguments,
			() => {
				When(
					'logWarning is called with the arguments',
					when.logWarningIsCalledWithTheArguments,
					() => {
						Then(
							'console.warn should be called with the first string in yellow and the other arguments',
							then.consoleWarnShouldBeCalledWithTheFirstStringInYellowAndTheOtherArguments,
						);
					},
				);
			},
		);
	});
	describe('logError', () => {
		Given(
			'string arguments "Something to be warned about" and "Something else"',
			given.stringArguments,
			() => {
				When(
					'logError is called with the arguments',
					when.logErrorIsCalledWithTheArguments,
					() => {
						Then(
							'console.error should be called with the strings in red',
							then.consoleErrorShouldBeCalledWithTheStringsInRed,
						);
					},
				);
			},
		);
		Given(
			'string arguments "This has %s substitution", "a string" and "Something else"',
			given.stringArguments,
			() => {
				When(
					'logError is called with the arguments',
					when.logErrorIsCalledWithTheArguments,
					() => {
						Then(
							'console.error should be called with the first string in red and the other arguments',
							then.consoleErrorShouldBeCalledWithTheFirstStringInRedAndTheOtherArguments,
						);
					},
				);
			},
		);
	});
});
