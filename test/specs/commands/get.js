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

describe('get command', () => {
	describe('Given a query instance has been initialised', () => {
		beforeEach(given.aQueryInstanceHasBeenInitialised);
		describe('Given an action "get"', () => {
			beforeEach(given.anAction);
			describe('Given an unknown type "random"', () => {
				beforeEach(given.anUnknownType);
				describe('Given an input "13133549779353512613L"', () => {
					beforeEach(given.anInput);
					describe('When the action is called with the type and the input', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInput);
						it('Then it should reject with message "Unsupported type."', then.itShouldRejectWithMessage);
					});
				});
			});
			describe('Given a type "account"', () => {
				beforeEach(given.aType);
				describe('Given an input "13133549779353512613L"', () => {
					beforeEach(given.anInput);
					describe('When the action is called with the type and the input', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInput);
						it('Then it should resolve to the result of the query', then.itShouldResolveToTheResultOfTheQuery);
					});
				});
			});
			describe('Given a type "address"', () => {
				beforeEach(given.aType);
				describe('Given an input "13133549779353512613L"', () => {
					beforeEach(given.anInput);
					describe('When the action is called with the type and the input', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInput);
						it('Then it should resolve to the result of the query', then.itShouldResolveToTheResultOfTheQuery);
					});
				});
			});
			describe('Given a type "block"', () => {
				beforeEach(given.aType);
				describe('Given an input "3641049113933914102"', () => {
					beforeEach(given.anInput);
					describe('When the action is called with the type and the input', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInput);
						it('Then it should resolve to the result of the query', then.itShouldResolveToTheResultOfTheQuery);
					});
				});
			});
			describe('Given a type "delegate"', () => {
				beforeEach(given.aType);
				describe('Given an input "lightcurve"', () => {
					beforeEach(given.anInput);
					describe('When the action is called with the type and the input', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInput);
						it('Then it should resolve to the result of the query', then.itShouldResolveToTheResultOfTheQuery);
					});
				});
			});
			describe('Given a type "transaction"', () => {
				beforeEach(given.aType);
				describe('Given an input "16388447461355055139"', () => {
					beforeEach(given.anInput);
					describe('When the action is called with the type and the input', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInput);
						it('Then it should resolve to the result of the query', then.itShouldResolveToTheResultOfTheQuery);
					});
				});
			});
		});
	});
});
