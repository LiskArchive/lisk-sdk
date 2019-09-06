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
const { constants, randomInt } = require('../../../../../utils');
const { shuffleDelegateListForRound } = require('./utils');

describe('dpos.getRoundDelegates()', () => {
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
					getRoundDelegates: jest.fn().mockReturnValue(delegatePublicKeys),
					create: jest.fn(),
					delete: jest.fn(),
				},
			},
		};

		dpos = new Dpos({
			...stubs,
			activeDelegates: constants.ACTIVE_DELEGATES,
		});
	});

	describe('When non-shuffled delegate public keys for the round IS in the cache', () => {
		it('should return shuffled delegate public keys by ONLY using cache', async () => {
			// Arrange
			const roundNo = randomInt(10, 100);
			const shuffledList = shuffleDelegateListForRound(
				roundNo,
				delegatePublicKeys,
			);
			dpos.delegatesList.delegateListCache[roundNo] = [...delegatePublicKeys];

			// Act
			const list = await dpos.getRoundDelegates(roundNo);

			// Assert
			expect(list).toEqual(shuffledList);
			expect(
				stubs.storage.entities.RoundDelegates.getRoundDelegates,
			).not.toHaveBeenCalled();
			expect(stubs.storage.entities.Account.get).not.toHaveBeenCalled();
		});
	});

	describe('When non-shuffled delegate public keys for the round is NOT in the cache', () => {
		let roundNo;
		let shuffledList;
		let list;
		beforeEach(async () => {
			// Arrange
			roundNo = randomInt(10, 100);
			when(stubs.storage.entities.RoundDelegates.getRoundDelegates)
				.calledWith(roundNo)
				.mockResolvedValue(delegatePublicKeys);
			shuffledList = shuffleDelegateListForRound(roundNo, delegatePublicKeys);

			// Act
			list = await dpos.getRoundDelegates(roundNo);
		});

		it('should return shuffled delegate public keys by using round_delegates table', () => {
			// Assert
			expect(list).toEqual(shuffledList);
		});

		it('should add the non-shuffled delegate list to the cache for the round', () => {
			// Assert
			expect(dpos.delegatesList.delegateListCache[roundNo]).toEqual(
				delegatePublicKeys,
			);
		});
	});

	describe('Given the round is NOT in the cache and NOT in the round_delegates table', () => {
		let roundNo;
		let shuffledList;
		let list;
		beforeEach(async () => {
			// Arrange
			roundNo = randomInt(10, 100);
			when(stubs.storage.entities.RoundDelegates.getRoundDelegates)
				.calledWith(roundNo)
				.mockResolvedValue([]);
			stubs.storage.entities.Account.get.mockResolvedValue(delegateAccounts);
			shuffledList = shuffleDelegateListForRound(roundNo, delegatePublicKeys);

			// Act
			list = await dpos.getRoundDelegates(roundNo);
		});

		it('should return shuffled delegate list by using delegate accounts', () => {
			// Assert
			expect(stubs.storage.entities.Account.get).toHaveBeenCalledWith(
				{ isDelegate: true },
				{
					limit: constants.ACTIVE_DELEGATES,
					sort: ['voteWeight:desc', 'publicKey:asc'],
				},
			);
			expect(list).toEqual(shuffledList);
		});

		it('should save delegate public keys to round_delegates table', () => {
			// Assert
			expect(stubs.storage.entities.RoundDelegates.create).toHaveBeenCalledWith(
				{
					round: roundNo,
					delegatePublicKeys,
				},
			);
		});

		it('should add the non-shuffled delegate list to the cache for the round', () => {
			// Assert
			expect(dpos.delegatesList.delegateListCache[roundNo]).toEqual(
				delegatePublicKeys,
			);
		});
	});
});
