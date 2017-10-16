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
import { setUpHelperStubs } from '../../steps/utils';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('print utils', () => {
	beforeEach(() => {
		setUpHelperStubs();
	});

	describe('#printResult', () => {
		describe('Given there is a Vorpal instance with an active command that can log', () => {
			beforeEach(given.thereIsAVorpalInstanceWithAnActiveCommandThatCanLog);

			describe('Given there is a result to print', () => {
				beforeEach(given.thereIsAResultToPrint);

				describe('Given a config with json set to "true"', () => {
					beforeEach(given.aConfigWithJsonSetTo);

					describe('When the result is printed', () => {
						beforeEach(when.theResultIsPrinted);

						it('Then shouldUseJsonOutput should be called with the config and an empty options object', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndAnEmptyOptionsObject);
					});

					describe('Given an options object with json set to "false"', () => {
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

							describe('When the result is printed', () => {
								beforeEach(when.theResultIsPrinted);

								it('Then shouldUseJsonOutput should be called with the config and the options', then.shouldUseJsonOutputShouldBeCalledWithTheConfigAndTheOptions);
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
