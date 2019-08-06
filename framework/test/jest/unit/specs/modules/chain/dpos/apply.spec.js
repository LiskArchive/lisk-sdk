const randomInt = require('random-int');
const { when } = require('jest-when');
const { Dpos } = require('../../../../../../../src/modules/chain/dpos');
const { BlockSlots } = require('../../../../../../../src/modules/chain/blocks');
const { constants } = require('../../../../utils');
const {
	delegateAccounts,
	delegatePublicKeys,
	delegatesWhoForged,
	uniqueDelegatesWhoForged,
	delegatesWhoMissed,
	delegateWhoForgedLast,
} = require('./round_delegates');

describe('dpos.apply()', () => {
	const stubs = {};
	let dpos;
	let slots;
	beforeEach(() => {
		// Arrange
		stubs.storage = {
			entities: {
				Account: {
					get: jest.fn(),
					increaseFieldBy: jest.fn(),
					update: jest.fn(),
				},
				RoundDelegates: {
					getRoundDelegates: jest.fn().mockReturnValue(delegatePublicKeys),
				},
				Round: {
					summedRound: jest.fn(),
				},
			},
		};

		stubs.logger = {
			debug: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
		};

		stubs.tx = jest.fn();

		slots = new BlockSlots({
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

	describe('Given block height is "1" (the genesis block)', () => {
		let genesisBlock;
		beforeEach(() => {
			// Arrange
			genesisBlock = {
				height: 1,
			};
		});

		it('should resolve with "false"', async () => {
			// Act
			const result = await dpos.apply(genesisBlock);

			// Assert
			expect(result).toBeFalse();
		});

		it('should NOT update "producedBlocks", "missedBlocks", "rewards", "fees", "votes"', async () => {
			// Act
			await dpos.apply(genesisBlock);

			// Assert
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).not.toHaveBeenCalled();

			expect(stubs.storage.entities.Account.update).not.toHaveBeenCalled();
		});
	});

	it('should increase "producedBlocks" field by "1" for the generator delegate', async () => {
		// Arrange
		const block = {
			height: 2,
			generatorPublicKey: 'generatorPublicKey#RANDOM',
		};

		// Act
		await dpos.apply(block, stubs.tx);

		// Assert
		expect(stubs.storage.entities.Account.increaseFieldBy).toHaveBeenCalledWith(
			{ publicKey_eq: block.generatorPublicKey },
			'producedBlocks',
			'1',
			stubs.tx,
		);
	});

	describe('Given block is NOT the last block of the round', () => {
		it('should NOT update "missedBlocks", "rewards", "fees", "votes"', async () => {
			// Arrange
			const block = {
				height: 2,
				generatorPublicKey: 'generatorPublicKey#RANDOM',
			};

			// Act
			await dpos.apply(block, stubs.tx);

			// Assert
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledTimes(1);
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledWith(
				expect.any(Object),
				'producedBlocks',
				expect.any(String),
				expect.anything(),
			);

			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).not.toHaveBeenCalledWith(expect.any(Object), 'missedBlocks');
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).not.toHaveBeenCalledWith(expect.any(Object), 'vote_new');
			expect(stubs.storage.entities.Account.update).not.toHaveBeenCalled();
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRound;
		let feePerDelegate;
		let rewardPerDelegate;
		let totalFee;
		let getTotalEarningsOfDelegate;
		beforeEach(() => {
			// Arrange
			lastBlockOfTheRound = {
				height: 202,
				generatorPublicKey: delegateWhoForgedLast.publicKey,
			};

			delegateAccounts.forEach(account => {
				when(stubs.storage.entities.Account.get)
					.calledWith({
						publicKey_eq: account.publicKey,
					})
					.mockResolvedValue(account);
			});

			feePerDelegate = randomInt(10, 100);
			totalFee = feePerDelegate * constants.ACTIVE_DELEGATES;

			// Delegates who forged got their rewards
			rewardPerDelegate = randomInt(1, 20);

			getTotalEarningsOfDelegate = account => {
				const blockCount = delegatesWhoForged.filter(
					d => d.publicKey === account.publicKey,
				).length;
				const reward = rewardPerDelegate * blockCount;
				const fee = feePerDelegate * blockCount;
				return {
					reward,
					fee,
				};
			};

			stubs.storage.entities.Round.summedRound.mockResolvedValue([
				{
					fees: totalFee, // dividable to ACTIVE_DELEGATE count
					rewards: delegatesWhoForged.map(() => rewardPerDelegate),
					delegates: delegatesWhoForged.map(account => account.publicKey),
				},
			]);
		});

		it('should increase "missedBlocks" field by "1" for the delegates who missed forging slot', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect(
				stubs.storage.entities.Account.increaseFieldBy,
			).toHaveBeenCalledWith(
				{
					publicKey_in: delegatesWhoMissed.map(a => a.publicKey),
				},
				'missedBlocks',
				'1',
				stubs.tx,
			);
		});

		it('should distribute rewards and fees ONLY to the delegates who forged', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect.assertions(constants.ACTIVE_DELEGATES);

			// Assert Group 1/2
			uniqueDelegatesWhoForged.forEach(account => {
				expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
					{
						publicKey_eq: account.publicKey,
					},
					expect.any(Object),
					stubs.tx,
				);
			});

			// Assert Group 2/2
			delegatesWhoMissed.forEach(account => {
				expect(stubs.storage.entities.Account.update).not.toHaveBeenCalledWith({
					publicKey_eq: account.publicKey,
				});
			});
		});

		it('should distribute more rewards and fees (with correct balance) to delegates based on number of blocks they forged', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length);
			uniqueDelegatesWhoForged.forEach(account => {
				const { fee, reward } = getTotalEarningsOfDelegate(account);
				const amount = reward + fee;
				const data = {
					...account,
					balance: account.balance.plus(amount),
					fees: account.fees.plus(fee),
					rewards: account.rewards.plus(reward),
				};

				expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
					{
						publicKey_eq: account.publicKey,
					},
					data,
					stubs.tx,
				);
			});
		});

		it('should give the remainingFee ONLY to the last delegate of the round who forged', async () => {
			// Arrange
			const remainingFee = randomInt(5, 10);
			stubs.storage.entities.Round.summedRound.mockResolvedValue([
				{
					fees: totalFee + remainingFee,
					rewards: delegatesWhoForged.map(() => rewardPerDelegate),
					delegates: delegatesWhoForged.map(a => a.publicKey),
				},
			]);

			// Act
			await dpos.apply(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect.assertions(uniqueDelegatesWhoForged);
			expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
				{
					publicKey_eq: delegateWhoForgedLast.publicKey,
				},
				expect.objectContaining({
					/**
					 * Delegate who forged last also forged 3 times,
					 * Thus will get fee 3 times too.
					 */
					fees: delegateWhoForgedLast.fees.add(
						feePerDelegate * 3 + remainingFee,
					),
				}),
				stubs.tx,
			);

			uniqueDelegatesWhoForged
				.filter(d => d.publicKey !== delegateWhoForgedLast.publicKey)
				.forEach(account => {
					const blockCount = delegatesWhoForged.filter(
						d => d.publicKey === account.publicKey,
					).length;
					expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
						{
							publicKey_eq: account.publicKey,
						},
						expect.objectContaining({
							/**
							 * Rest of the delegates don't get the remaining fee
							 */
							fees: account.fees.add(feePerDelegate * blockCount),
						}),
						stubs.tx,
					);
				});
		});

		it('should update vote weight of accounts that delegates who forged voted for', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRound, stubs.tx);

			// Assert
			expect.assertions(uniqueDelegatesWhoForged.length);
			uniqueDelegatesWhoForged.forEach(account => {
				const { fee, reward } = getTotalEarningsOfDelegate(account);
				const amount = fee + reward;

				expect(
					stubs.storage.entities.Account.increaseFieldBy,
				).toHaveBeenCalledWith(
					{
						publicKey_in: account.votedDelegatesPublicKeys,
					},
					'vote_new',
					amount.toString(),
					stubs.tx,
				);
			});
		});

		describe('When all delegates successfully forges a block', () => {
			it('should NOT update "missedBlocks" for anyone', async () => {
				// Arrange
				stubs.storage.entities.Round.summedRound.mockResolvedValue([
					{
						fees: totalFee,
						rewards: delegateAccounts.map(() => randomInt(1, 20)),
						delegates: delegateAccounts.map(a => a.publicKey),
					},
				]);

				// Act
				await dpos.apply(lastBlockOfTheRound, stubs.tx);

				expect(
					stubs.storage.entities.Account.increaseFieldBy,
				).not.toHaveBeenCalledWith(expect.any, 'missedBlocks');
			});
		});

		describe('When summarizing round fails', () => {
			it('should throw the error message coming from summedRound method', async () => {
				// Arrange
				const err = new Error('dummyError');
				stubs.storage.entities.Round.summedRound.mockRejectedValue(err);

				// Act && Assert
				await expect(dpos.apply(lastBlockOfTheRound, stubs.tx)).rejects.toBe(
					err,
				);
			});
		});

		describe('Given the provided block is in an exception round', () => {
			let exceptionFactors;
			beforeEach(() => {
				// Arrange
				exceptionFactors = {
					rewards_factor: 2,
					fees_factor: 2,
					// setting bonus to a dividable amount
					fees_bonus: constants.ACTIVE_DELEGATES * 123,
				};
				const exceptionRound = slots.calcRound(lastBlockOfTheRound.height);
				const exceptions = {
					rounds: {
						[exceptionRound]: exceptionFactors,
					},
				};

				dpos = new Dpos({
					slots,
					...stubs,
					activeDelegates: constants.ACTIVE_DELEGATES,
					exceptions,
				});
			});

			it('should multiply delegate reward with "rewards_factor"', async () => {
				// Act
				await dpos.apply(lastBlockOfTheRound, stubs.tx);

				// Assert
				expect.assertions(uniqueDelegatesWhoForged.length);
				uniqueDelegatesWhoForged.forEach(account => {
					const { reward } = getTotalEarningsOfDelegate(account);
					const exceptionReward = reward * exceptionFactors.rewards_factor;
					const partialData = {
						rewards: account.rewards.add(exceptionReward),
					};

					// Assert
					expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
						{
							publicKey_eq: account.publicKey,
						},
						expect.objectContaining(partialData),
						stubs.tx,
					);
				});
			});

			it('should should multiple "totalFee" with "fee_factor" and add "fee_bonus"', async () => {
				// Act
				await dpos.apply(lastBlockOfTheRound, stubs.tx);

				uniqueDelegatesWhoForged.forEach(account => {
					const blockCount = delegatesWhoForged.filter(
						d => d.publicKey === account.publicKey,
					).length;

					const exceptionTotalFee =
						totalFee * exceptionFactors.fees_factor +
						exceptionFactors.fees_bonus;

					const earnedFee =
						(exceptionTotalFee / constants.ACTIVE_DELEGATES) * blockCount;

					const partialData = {
						fees: account.fees.add(earnedFee),
					};

					// Assert
					expect(stubs.storage.entities.Account.update).toHaveBeenCalledWith(
						{
							publicKey_eq: account.publicKey,
						},
						expect.objectContaining(partialData),
						stubs.tx,
					);
				});
			});
		});
	});
});
