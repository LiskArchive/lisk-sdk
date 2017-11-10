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
import { setUpCommandList } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('list command', () => {
	beforeEach(setUpCommandList);
	describe('Given a query instance has been initialised', () => {
		beforeEach(given.aQueryInstanceHasBeenInitialised);
		describe('Given an action "list"', () => {
			beforeEach(given.anAction);
			describe('Given an unknown type "random"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "lightcurve" and "tosch"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should reject with message "Unsupported type."', then.itShouldRejectWithMessage);
					});
				});
			});
			describe('Given a type "account"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "13133549779353512613L" and "13133549779353512255L"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "accounts"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "13133549779353512613L" and "13133549779353512255L"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "address"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "13133549779353512613L" and "13133549779353512255L"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "addresses"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "13133549779353512613L" and "13133549779353512255L"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "block"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "3641049113933914102" and "3641049113933914999"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "blocks"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "3641049113933914102" and "3641049113933914999"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "delegate"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "lightcurve" and "tosch"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "delegates"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "lightcurve" and "tosch"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "transaction"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "16388447461355055139" and "16388447461355054444"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
			describe('Given a type "transactions"', () => {
				beforeEach(given.anUnknownType);
				describe('Given inputs "16388447461355055139" and "16388447461355054444"', () => {
					beforeEach(given.inputs);
					describe('When the action is called with the type and the inputs', () => {
						beforeEach(when.theActionIsCalledWithTheTypeAndTheInputs);
						it('Then it should resolve to an array of query results', then.itShouldResolveToAnArrayOfQueryResults);
					});
				});
			});
		});
	});
});
