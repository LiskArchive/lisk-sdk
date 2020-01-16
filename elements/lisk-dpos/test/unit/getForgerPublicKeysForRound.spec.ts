/*
 * Copyright © 2019 Lisk Foundation
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
 */

import { when } from 'jest-when';
import { Dpos } from '../../src';
import { delegatePublicKeys, delegateAccounts } from '../utils/round_delegates';
import {
	ACTIVE_DELEGATES,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import * as shuffledDelegatePublicKeys from '../fixtures/shuffled_delegate_publickeys_for_round_5.json';

/**
 * shuffledDelegatePublicKeys is created for the round: 5
 * If you need to update the round number or
 * need shuffled list for another round, please create/update
 * the list accordingly.
 */
describe('dpos.getForgerPublicKeysForRound()', () => {
	const stubs = {} as any;
	let dpos: Dpos;

	beforeEach(() => {
		// Arrange
		stubs.storage = {
			entities: {
				Account: {
					get: jest.fn(),
				},
				RoundDelegates: {
					getActiveDelegatesForRound: jest
						.fn()
						.mockReturnValue(delegatePublicKeys),
					create: jest.fn(),
					delete: jest.fn(),
				},
			},
		};

		dpos = new Dpos({
			...stubs,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
		});
	});

	describe('Given delegateListRoundOffset is NOT used', () => {
		const round = 5;
		const roundWithOffset = 3;

		it('should return shuffled delegate public keys by using round_delegates table record', async () => {
			// Arrange
			when(stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound)
				.calledWith(roundWithOffset)
				.mockReturnValue(delegatePublicKeys);

			// Act
			const list = await dpos.getForgerPublicKeysForRound(round);

			// Assert
			expect(list).toEqual(shuffledDelegatePublicKeys);
		});

		it('should throw error when round is not in round_delegates table', async () => {
			// Arrange
			when(stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound)
				.calledWith(roundWithOffset)
				.mockReturnValue([]);
			stubs.storage.entities.Account.get.mockReturnValue(delegateAccounts);

			// Act && Assert
			return expect(dpos.getForgerPublicKeysForRound(round)).rejects.toThrow(
				`No delegate list found for round: ${round}`,
			);
		});
	});

	describe('Given delegateListRoundOffset is used and equal to 0', () => {
		const round = 5;
		const roundWithOffset = 5;
		const delegateListRoundOffset = 0;

		it('should return shuffled delegate public keys by using round_delegates table record', async () => {
			// Arrange
			when(stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound)
				.calledWith(roundWithOffset)
				.mockReturnValue(delegatePublicKeys);

			// Act
			const list = await dpos.getForgerPublicKeysForRound(round, {
				delegateListRoundOffset,
			});

			// Assert
			expect(list).toEqual(shuffledDelegatePublicKeys);
		});

		it('should throw error when round is not in round_delegates table', async () => {
			// Arrange
			when(stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound)
				.calledWith(roundWithOffset)
				.mockReturnValue([]);
			stubs.storage.entities.Account.get.mockReturnValue(delegateAccounts);

			// Act && Assert
			return expect(
				dpos.getForgerPublicKeysForRound(round, { delegateListRoundOffset }),
			).rejects.toThrow(`No delegate list found for round: ${round}`);
		});
	});
});
