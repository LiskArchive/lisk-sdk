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
		describe('Given a Vorpal instance with an active command that can log', () => {
			beforeEach(given.aVorpalInstanceWithAnActiveCommandThatCanLog);
			describe('Given there is a result to print', () => {
				beforeEach(given.thereIsAResultToPrint);
				describe('Given a config with json set to true', () => {
					beforeEach(given.aConfigWithJsonSetTo);
					describe('When the result is printed', () => {
						beforeEach(when.theResultIsPrinted);
						it('Then shouldUseJsonOutput should be called with the config and an empty options object', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject);
						it('Then shouldUsePrettyOutput should be called with the config and an empty options object', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject);
					});
					describe('Given an options object with json set to false', () => {
						beforeEach(given.anOptionsObjectWithJsonSetTo);
						describe('Given JSON should not be printed', () => {
							beforeEach(given.jsonShouldNotBePrinted);
							describe('When the result is printed', () => {
								beforeEach(when.theResultIsPrinted);
								it('Then shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
								it('Then the result should be returned', then.theResultShouldBeReturned);
								it('Then a table should be logged', then.aTableShouldBeLogged);
							});
						});
						describe('Given JSON should be printed', () => {
							beforeEach(given.jsonShouldBePrinted);
							describe('Given output should not be pretty', () => {
								beforeEach(given.outputShouldNotBePretty);
								describe('When the result is printed', () => {
									beforeEach(when.theResultIsPrinted);
									it('Then shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
									it('Then shouldUsePrettyOutput should be called with the config and the options', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions);
									it('Then the result should be returned', then.theResultShouldBeReturned);
									it('Then JSON output should be logged', then.jSONOutputShouldBeLogged);
								});
							});
							describe('Given the options object has key "pretty" set to boolean true', () => {
								beforeEach(given.theOptionsObjectHasKeySetToBoolean);
								describe('Given output should be pretty', () => {
									beforeEach(given.outputShouldBePretty);
									describe('When the result is printed', () => {
										beforeEach(when.theResultIsPrinted);
										it('Then shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
										it('Then shouldUsePrettyOutput should be called with the config and the options', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions);
										it('Then the result should be returned', then.theResultShouldBeReturned);
										it('Then pretty JSON output should be logged', then.prettyJSONOutputShouldBeLogged);
									});
								});
							});
						});
					});
				});
				describe('Given a config with json set to true and pretty set to true', () => {
					beforeEach(given.aConfigWithJsonSetToAndPrettySetTo);
					describe('Given an empty options object', () => {
						beforeEach(given.anEmptyOptionsObject);
						describe('Given JSON should be printed', () => {
							beforeEach(given.jsonShouldBePrinted);
							describe('Given output should be pretty', () => {
								beforeEach(given.outputShouldBePretty);
								describe('When the result is printed', () => {
									beforeEach(when.theResultIsPrinted);
									it('Then shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
									it('Then shouldUsePrettyOutput should be called with the config and the options', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions);
									it('Then the result should be returned', then.theResultShouldBeReturned);
									it('Then pretty JSON output should be logged', then.prettyJSONOutputShouldBeLogged);
								});
							});
						});
					});
					describe('Given an options object with key "pretty" set to boolean false', () => {
						beforeEach(given.anOptionsObjectWithKeySetToBoolean);
						describe('Given JSON should be printed', () => {
							beforeEach(given.jsonShouldBePrinted);
							describe('Given output should not be pretty', () => {
								beforeEach(given.outputShouldNotBePretty);
								describe('When the result is printed', () => {
									beforeEach(when.theResultIsPrinted);
									it('Then shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
									it('Then shouldUsePrettyOutput should be called with the config and the options', then.shouldUsePrettyOutputShouldBeCalledWithTheConfigAndTheOptions);
									it('Then the result should be returned', then.theResultShouldBeReturned);
									it('Then JSON output should be logged', then.jSONOutputShouldBeLogged);
								});
							});
						});
					});
				});
			});
		});
	});
});
