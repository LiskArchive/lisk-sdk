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

const { Dpos, Slots } = require('../../../../../../../src/modules/chain/dpos');
const { constants } = require('../../../../utils');
const { delegatePublicKeys } = require('./round_delegates');

describe('dpos.verifyBlockForger()', () => {
	const stubs = {};
	let dpos;
	let slots;

	beforeEach(() => {
		// Arrange
		stubs.storage = {
			entities: {
				RoundDelegates: {
					getRoundDelegates: jest.fn().mockReturnValue(delegatePublicKeys),
					create: jest.fn(),
				},
				Account: {
					get: jest.fn().mockReturnValue([]),
				},
			},
		};

		stubs.logger = {
			debug: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
		};

		slots = new Slots({
			epochTime: constants.EPOCH_TIME,
			interval: constants.BLOCK_TIME,
			blocksPerRound: constants.ACTIVE_DELEGATES,
		});

		dpos = new Dpos({
			slots,
			...stubs,
			activeDelegates: constants.ACTIVE_DELEGATES,
		});
	});

	it('should resolve with "true" when block is forged by correct delegate', async () => {
		// Arrange
		const block = {
			height: 302,
			timestamp: 23450,
			generatorPublicKey:
				'6fb2e0882cd9d895e1e441b9f9be7f98e877aa0a16ae230ee5caceb7a1b896ae',
		};

		// Act
		const result = await dpos.verifyBlockForger(block);

		// Assert
		expect(result).toBeTrue();
	});

	it('should throw error if block is forged by incorrect delegate', async () => {
		// Arrange
		const block = {
			height: 302,
			timestamp: 23450,
			generatorPublicKey: 'xxx',
		};

		const expectedSlot = slots.getSlotNumber(block.timestamp);

		// Act && Assert
		const error = new Error(`Failed to verify slot: ${expectedSlot}`);
		await expect(dpos.verifyBlockForger(block)).rejects.toEqual(error);
	});

	it('should throw error if no delegate list is found', async () => {
		// Arrange
		stubs.storage.entities.RoundDelegates.getRoundDelegates.mockResolvedValue(
			[],
		);
		const block = {
			id: 'myid',
			height: 302,
			timestamp: 23450,
			generatorPublicKey: 'xxx',
		};

		const expectedRound = slots.calcRound(block.height);

		// Act && Assert
		const error = new Error(
			`No delegate list found for round: ${expectedRound}`,
		);
		await expect(dpos.verifyBlockForger(block)).rejects.toEqual(error);
	});
});
