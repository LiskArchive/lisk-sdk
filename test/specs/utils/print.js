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
import { setUpUtilPrint } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('print utils', () => {
	beforeEach(setUpUtilPrint);
	describe('#printResult', () => {
		Given('a Vorpal instance with an active command that can log', given.aVorpalInstanceWithAnActiveCommandThatCanLog, () => {
			Given('there is a result to print', given.thereIsAResultToPrint, () => {
				Given('a config with json set to true', given.aConfigWithJsonSetTo, () => {
					When('the result is printed', when.theResultIsPrinted, () => {
						Then('shouldUseJsonOutput should be called with the config and an empty options object', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject);
						Then('shouldUsePrettyOutput should be called with the config and an empty options object', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject);
					});
					Given('an options object with json set to false', given.anOptionsObjectWithJsonSetTo, () => {
						Given('JSON should not be printed', given.jsonShouldNotBePrinted, () => {
							When('the result is printed', when.theResultIsPrinted, () => {
								Then('shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
								Then('the result should be returned', then.theResultShouldBeReturned);
								Then('a table should be logged', then.aTableShouldBeLogged);
							});
						});
						Given('JSON should be printed', given.jsonShouldBePrinted, () => {
							Given('output should not be pretty', given.outputShouldNotBePretty, () => {
								When('the result is printed', when.theResultIsPrinted, () => {
									Then('shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
									Then('shouldUsePrettyOutput should be called with the config and the options', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions);
									Then('the result should be returned', then.theResultShouldBeReturned);
									Then('JSON output should be logged', then.jSONOutputShouldBeLogged);
								});
							});
							Given('the options object has key "pretty" set to boolean true', given.theOptionsObjectHasKeySetToBoolean, () => {
								Given('output should be pretty', given.outputShouldBePretty, () => {
									When('the result is printed', when.theResultIsPrinted, () => {
										Then('shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
										Then('shouldUsePrettyOutput should be called with the config and the options', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions);
										Then('the result should be returned', then.theResultShouldBeReturned);
										Then('pretty JSON output should be logged', then.prettyJSONOutputShouldBeLogged);
									});
								});
							});
						});
					});
				});
				Given('a config with json set to true and pretty set to true', given.aConfigWithJsonSetToAndPrettySetTo, () => {
					Given('an empty options object', given.anEmptyOptionsObject, () => {
						Given('JSON should be printed', given.jsonShouldBePrinted, () => {
							Given('output should be pretty', given.outputShouldBePretty, () => {
								When('the result is printed', when.theResultIsPrinted, () => {
									Then('shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
									Then('shouldUsePrettyOutput should be called with the config and the options', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions);
									Then('the result should be returned', then.theResultShouldBeReturned);
									Then('pretty JSON output should be logged', then.prettyJSONOutputShouldBeLogged);
								});
							});
						});
					});
					Given('an options object with key "pretty" set to boolean false', given.anOptionsObjectWithKeySetToBoolean, () => {
						Given('JSON should be printed', given.jsonShouldBePrinted, () => {
							Given('output should not be pretty', given.outputShouldNotBePretty, () => {
								When('the result is printed', when.theResultIsPrinted, () => {
									Then('shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
									Then('shouldUsePrettyOutput should be called with the config and the options', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions);
									Then('the result should be returned', then.theResultShouldBeReturned);
									Then('JSON output should be logged', then.jSONOutputShouldBeLogged);
								});
							});
						});
					});
				});
			});
		});
	});
});
