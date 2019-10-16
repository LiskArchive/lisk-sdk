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

'use strict';

const { when } = require('jest-when');
const { Dpos } = require('../../../../../../../../src/modules/chain/dpos');
const { delegatePublicKeys, delegateAccounts } = require('../round_delegates');
const shuffledDelegatePublicKeys = require('./shuffled_delegate_publickeys_for_round_5.json');
const { constants } = require('../../../../../../utils');

/**
 * shuffledDelegatePublicKeys is created for the round: 5
 * If you need to update the round number or
 * need shuffled list for another round, please create/update
 * the list accordingly.
 */
describe('dpos.getForgerPublicKeysForRound()', () => {
	const stubs = {};
	let dpos;

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
			activeDelegates: constants.ACTIVE_DELEGATES,
			delegateListRoundOffset: constants.DELEGATE_LIST_ROUND_OFFSET,
		});
	});

	describe('Given delegateListRoundOffset is NOT used', () => {
		const round = 5;
		const roundWithOffset = 3;

		it('should return shuffled delegate public keys by using round_delegates table record', async () => {
			// Arrange
			when(stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound)
				.calledWith(roundWithOffset)
				.mockResolvedValue(delegatePublicKeys);

			// Act
			const list = await dpos.getForgerPublicKeysForRound(round);

			// Assert
			expect(list).toEqual(shuffledDelegatePublicKeys);
		});

		it('should throw error when round is not in round_delegates table', async () => {
			// Arrange
			when(stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound)
				.calledWith(roundWithOffset)
				.mockResolvedValue([]);
			stubs.storage.entities.Account.get.mockResolvedValue(delegateAccounts);

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
				.mockResolvedValue(delegatePublicKeys);

			// Act
			const list = await dpos.getForgerPublicKeysForRound(
				round,
				delegateListRoundOffset,
			);

			// Assert
			expect(list).toEqual(shuffledDelegatePublicKeys);
		});

		it('should throw error when round is not in round_delegates table', async () => {
			// Arrange
			when(stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound)
				.calledWith(roundWithOffset)
				.mockResolvedValue([]);
			stubs.storage.entities.Account.get.mockResolvedValue(delegateAccounts);

			// Act && Assert
			return expect(
				dpos.getForgerPublicKeysForRound(round, delegateListRoundOffset),
			).rejects.toThrow(`No delegate list found for round: ${round}`);
		});
	});
});
