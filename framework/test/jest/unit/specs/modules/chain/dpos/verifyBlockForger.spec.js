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
const { constants } = require('../../../../../utils');
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
					getActiveDelegatesForRound: jest
						.fn()
						.mockReturnValue(delegatePublicKeys),
					// @todo create was stubbed but never used, create an issue to remove it or add a test case
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
			delegateListRoundOffset: constants.DELEGATE_LIST_ROUND_OFFSET,
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

	it('should use round 1 delegate list when block round is equal to 1', async () => {
		// Arrange
		const expectedRound = 1;
		const expectedTx = undefined;
		const block = {
			height: 99,
			timestamp: 23450,
			generatorPublicKey:
				'b5341e839b25c4cc2aaf421704c0fb6ba987d537678e23e45d3ca32454a2908c',
		};

		// Act
		await dpos.verifyBlockForger(block);

		// Assert
		expect(
			stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound,
		).toHaveBeenCalledWith(expectedRound, expectedTx);
	});

	it('should use round 1 delegate list when block round is equal to 2', async () => {
		// Arrange
		const expectedRound = 1;
		const expectedTx = undefined;
		const block = {
			height: 104,
			timestamp: 23450,
			generatorPublicKey:
				'386217d98eee87268a54d2d76ce9e801ac86271284d793154989e37cb31bcd0e',
		};

		// Act
		await dpos.verifyBlockForger(block);

		// Assert
		expect(
			stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound,
		).toHaveBeenCalledWith(expectedRound, expectedTx);
	});

	it('should use round 1 delegate list when block round is equal to 3', async () => {
		// Arrange
		const expectedRound = 1;
		const expectedTx = undefined;
		const block = {
			height: 222,
			timestamp: 23450,
			generatorPublicKey:
				'6fb2e0882cd9d895e1e441b9f9be7f98e877aa0a16ae230ee5caceb7a1b896ae',
		};

		// Act
		await dpos.verifyBlockForger(block);

		// Assert
		expect(
			stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound,
		).toHaveBeenCalledWith(expectedRound, expectedTx);
	});

	it('should use (round - delegateListRoundOffset) delegate list when block round is greater than 3', async () => {
		// Arrange
		const expectedTx = undefined;
		const block = {
			height: 321,
			timestamp: 23450,
			generatorPublicKey:
				'e6d075e3e396673c853210f74f8fe6db5e814c304bb9cd7f362018881a21f76c',
		};
		const round = slots.calcRound(block.height);

		// Act
		await dpos.verifyBlockForger(block);

		// Assert
		expect(
			stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound,
		).toHaveBeenCalledWith(
			round - constants.DELEGATE_LIST_ROUND_OFFSET,
			expectedTx,
		);
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
		const error = new Error(
			`Failed to verify slot: ${expectedSlot}. Block ID: ${block.id}. Block Height: ${block.height}`,
		);
		await expect(dpos.verifyBlockForger(block)).rejects.toEqual(error);
	});

	it('should throw error if no delegate list is found', async () => {
		// Arrange
		stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound.mockResolvedValue(
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

	describe('Given delegateListRoundOffset is set and equal to 0', () => {
		const delegateListRoundOffset = 0;

		it('should use round 1 delegate list when block round is equal to 1', async () => {
			// Arrange
			const expectedRound = 1;
			const expectedTx = undefined;
			const block = {
				height: 99,
				timestamp: 23450,
				generatorPublicKey:
					'b5341e839b25c4cc2aaf421704c0fb6ba987d537678e23e45d3ca32454a2908c',
			};

			// Act
			await dpos.verifyBlockForger(block, { delegateListRoundOffset });

			// Assert
			expect(
				stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound,
			).toHaveBeenCalledWith(expectedRound, expectedTx);
		});

		it('should use round 2 delegate list when block round is equal to 2', async () => {
			// Arrange
			const expectedRound = 2;
			const expectedTx = undefined;
			const block = {
				height: 104,
				timestamp: 23450,
				generatorPublicKey:
					'386217d98eee87268a54d2d76ce9e801ac86271284d793154989e37cb31bcd0e',
			};

			// Act
			await dpos.verifyBlockForger(block, { delegateListRoundOffset });

			// Assert
			expect(
				stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound,
			).toHaveBeenCalledWith(expectedRound, expectedTx);
		});

		it('should use round 3 delegate list when block round is equal to 3', async () => {
			// Arrange
			const expectedRound = 3;
			const expectedTx = undefined;
			const block = {
				height: 222,
				timestamp: 23450,
				generatorPublicKey:
					'6fb2e0882cd9d895e1e441b9f9be7f98e877aa0a16ae230ee5caceb7a1b896ae',
			};

			// Act
			await dpos.verifyBlockForger(block, { delegateListRoundOffset });

			// Assert
			expect(
				stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound,
			).toHaveBeenCalledWith(expectedRound, expectedTx);
		});

		it('should use round 4 delegate list when block round is equal to 4', async () => {
			// Arrange
			const expectedRound = 4;
			const expectedTx = undefined;
			const block = {
				height: 333,
				timestamp: 23450,
				generatorPublicKey:
					'e6d075e3e396673c853210f74f8fe6db5e814c304bb9cd7f362018881a21f76c',
			};

			// Act
			await dpos.verifyBlockForger(block, { delegateListRoundOffset });

			// Assert
			expect(
				stubs.storage.entities.RoundDelegates.getActiveDelegatesForRound,
			).toHaveBeenCalledWith(expectedRound, expectedTx);
		});
	});
});
