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

describe('utils helpers', () => {
	describe('#deAlias', () => {
		describe('Given a type "address" with alias "account"', () => {
			beforeEach(given.aTypeWithAlias);

			describe('When deAlias is called on the type', () => {
				beforeEach(when.deAliasIsCalledOnTheType);

				it('Then it should return the alias', then.itShouldReturnTheAlias);
			});
		});
		describe('Given a type "block" with no alias', () => {
			beforeEach(given.aTypeWithNoAlias);

			describe('When deAlias is called on the type', () => {
				beforeEach(when.deAliasIsCalledOnTheType);

				it('Then it should return the type', then.itShouldReturnTheType);
			});
		});
	});

	describe('#shouldUseJsonOutput', () => {
		describe('Given a config with json set to "true"', () => {
			beforeEach(given.aConfigWithJsonSetTo);

			describe('Given an options object with json set to "true"', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);

				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);

					it('Then it should return true', then.itShouldReturnTrue);
				});
			});

			describe('Given an options object with json set to "false"', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);

				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);

					it('Then it should return false', then.itShouldReturnFalse);
				});
			});

			describe('Given an empty options object', () => {
				beforeEach(given.anEmptyOptionsObject);

				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);

					it('Then it should return true', then.itShouldReturnTrue);
				});
			});
		});
		describe('Given a config with json set to "false"', () => {
			beforeEach(given.aConfigWithJsonSetTo);

			describe('Given an options object with json set to "true"', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);

				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);

					it('Then it should return true', then.itShouldReturnTrue);
				});
			});

			describe('Given an options object with json set to "false"', () => {
				beforeEach(given.anOptionsObjectWithJsonSetTo);

				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);

					it('Then it should return false', then.itShouldReturnFalse);
				});
			});

			describe('Given an empty options object', () => {
				beforeEach(given.anEmptyOptionsObject);

				describe('When shouldUseJsonOutput is called with the config and options', () => {
					beforeEach(when.shouldUseJsonOutputIsCalledWithTheConfigAndOptions);

					it('Then it should return false', then.itShouldReturnFalse);
				});
			});
		});
	});

	describe('#createErrorHandler', () => {
		describe('Given a prefix "Some error message prefix"', () => {
			beforeEach(given.aPrefix);

			describe('Given an object with message "Some message."', () => {
				beforeEach(given.anObjectWithMessage);

				describe('When createErrorHandler is called with the prefix', () => {
					beforeEach(when.createErrorHandlerIsCalledWithThePrefix);

					describe('When the returned function is called with the object', () => {
						beforeEach(when.theReturnedFunctionIsCalledWithTheObject);

						it('Then it should return an object with error "Some error message prefix: Some message."', then.itShouldReturnAnObjectWithError);
					});
				});
			});
		});
	});
});
