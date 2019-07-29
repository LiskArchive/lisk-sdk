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

const {
	Delegates,
	validateBlockSlot,
	getKeysSortByVote,
	getDelegatesFromPreviousRound,
} = require('../../../../../../src/modules/chain/rounds/delegates');
const { BlockSlots } = require('../../../../../../src/modules/chain/blocks');

describe('delegates', () => {
	const slots = new BlockSlots({
		epochTime: __testContext.config.constants.EPOCH_TIME,
		interval: __testContext.config.constants.BLOCK_TIME,
		blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
	});
	const mockChannel = {
		publish: sinonSandbox.stub(),
	};
	const mockLogger = {
		debug: sinonSandbox.stub(),
		info: sinonSandbox.stub(),
		error: sinonSandbox.stub(),
	};
	const mockStorage = {
		entities: {
			Account: {
				get: sinonSandbox.stub(),
				insertFork: sinonSandbox.stub(),
			},
			Round: {
				getDelegatesSnapshot: sinonSandbox.stub(),
			},
		},
	};
	let delegatesModule;

	beforeEach(async () => {
		delegatesModule = new Delegates({
			channel: mockChannel,
			logger: mockLogger,
			storage: mockStorage,
			slots,
		});
	});

	const exceptions = __testContext.config.modules.chain.exceptions;
	const activeDelegates = __testContext.config.constants.ACTIVE_DELEGATES;

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('#Delegate', () => {
		beforeEach(async () => {
			delegatesModule = new Delegates({
				channel: mockChannel,
				logger: mockLogger,
				storage: mockStorage,
				slots,
				constants: {
					activeDelegates,
				},
				exceptions: __testContext.config.modules.chain.exceptions,
			});
		});

		describe('fork', () => {
			const cause = 'aCause';
			const dummyBlock = {
				height: 1,
				generaterPublicKey: 'aDelegatePublicKey',
				timestamp: 12312344,
				id: 1231234234,
				previousBlock: 1243453543,
				cause,
			};

			it('should call insertFork fork data', async () => {
				const fork = {
					delegatePublicKey: dummyBlock.generatorPublicKey,
					blockTimestamp: dummyBlock.timestamp,
					blockId: dummyBlock.id,
					blockHeight: dummyBlock.height,
					previousBlockId: dummyBlock.previousBlock,
					cause,
				};
				await delegatesModule.fork(dummyBlock, cause);
				expect(mockStorage.entities.Account.insertFork).to.be.calledWithExactly(
					fork
				);
			});

			it('should call library.channel.publish with "chain:delegates:fork"', async () => {
				const fork = {
					delegatePublicKey: dummyBlock.generatorPublicKey,
					blockTimestamp: dummyBlock.timestamp,
					blockId: dummyBlock.id,
					blockHeight: dummyBlock.height,
					previousBlockId: dummyBlock.previousBlock,
					cause,
				};
				await delegatesModule.fork(dummyBlock, cause);
				expect(mockChannel.publish).to.be.calledWithExactly(
					'chain:delegates:fork',
					fork
				);
			});
		});

		describe('#generateDelegateList', () => {
			const initialSate = {
				1: ['j', 'k', 'l'],
			};
			const dummyDelegateList = ['x', 'y', 'z'];

			let originalExceptions;
			let sourceStub;

			beforeEach(async () => {
				// Arrange
				delegatesModule.delegatesListCache = { ...initialSate };
				sourceStub = sinonSandbox.stub().resolves(dummyDelegateList);
				originalExceptions = _.clone(
					exceptions.ignoreDelegateListCacheForRounds
				);
			});

			afterEach(async () => {
				exceptions.ignoreDelegateListCacheForRounds = originalExceptions;
			});

			it('should return the cached delegate list when there is cache for the round', async () => {
				// Act
				const delegateList = await delegatesModule.generateDelegateList(
					1,
					sourceStub
				);
				expect(delegateList).to.deep.equal(initialSate[1]);
				expect(sourceStub).to.not.been.called;
			});

			it('should call the source function when cache not found', async () => {
				// Act
				const delegateList = await delegatesModule.generateDelegateList(
					2,
					sourceStub
				);
				expect(sourceStub).to.been.called;
				expect(delegateList).to.deep.equal(dummyDelegateList);
			});

			it('should update the delegate list cache when source function was executed', async () => {
				const shuffledDummyDelegateList = ['y', 'z', 'x'];

				// Act
				const delegateList = await delegatesModule.generateDelegateList(
					2,
					sourceStub
				);
				expect(delegateList).to.deep.equal(dummyDelegateList);
				expect(delegatesModule.delegatesListCache['2']).to.deep.equal(
					shuffledDummyDelegateList
				);
			});

			it('should not update the delegate list cache when round is an exception', async () => {
				exceptions.ignoreDelegateListCacheForRounds.push(666);

				// Act
				const delegateList = await delegatesModule.generateDelegateList(
					666,
					sourceStub
				);
				expect(delegateList).to.deep.equal(dummyDelegateList);
				expect(delegatesModule.delegatesListCache).to.not.have.property('666');
			});
		});

		describe('#updateDelegateListCache', () => {
			it('should insert the given delegateList array to __private.delegateListCache for given round.', async () => {
				// Arrange
				const delegateListArray = ['a', 'b', 'c'];
				const round = 1;

				// Act
				delegatesModule.updateDelegateListCache(round, delegateListArray);

				// Assert
				expect(delegatesModule.delegatesListCache).to.have.property(round);
				expect(delegatesModule.delegatesListCache[round]).to.deep.equal(
					delegateListArray
				);
			});

			it('should sort rounds in ascending order.', async () => {
				// Arrange
				delegatesModule.delegatesListCache = {
					2: ['x', 'y', 'z'],
				};
				const delegateListArray = ['a', 'b', 'c'];
				const round = 1;

				// Act
				delegatesModule.updateDelegateListCache(round, delegateListArray);

				// Assert
				expect(Object.keys(delegatesModule.delegatesListCache)).to.deep.equal([
					'1',
					'2',
				]);
			});

			it('should keep only the last two rounds in the __private.delegateListCache.', async () => {
				// Arrange
				const initialSate = {
					1: ['j', 'k', 'l'],
					2: ['x', 'y', 'z'],
				};
				delegatesModule.delegatesListCache = { ...initialSate };
				const delegateListArray = ['a', 'b', 'c'];
				const round = 3;

				// Act
				delegatesModule.updateDelegateListCache(round, delegateListArray);

				// Assert
				expect(Object.keys(delegatesModule.delegatesListCache)).to.deep.equal([
					'2',
					'3',
				]);
				expect(delegatesModule.delegatesListCache['2']).to.deep.equal(
					initialSate['2']
				);
				expect(delegatesModule.delegatesListCache[round]).to.deep.equal(
					delegateListArray
				);
			});

			// See: https://github.com/LiskHQ/lisk/issues/2652
			it('ensures ordering rounds correctly', async () => {
				// Arrange
				const initialSate = {
					9: ['j', 'k', 'l'],
					10: ['x', 'y', 'z'],
				};
				delegatesModule.delegatesListCache = { ...initialSate };
				const delegateListArray = ['a', 'b', 'c'];
				const round = 11;

				// Act
				delegatesModule.updateDelegateListCache(round, delegateListArray);

				// Assert
				expect(Object.keys(delegatesModule.delegatesListCache)).to.deep.equal([
					'10',
					'11',
				]);
				expect(delegatesModule.delegatesListCache['10']).to.deep.equal(
					initialSate['10']
				);
				return expect(delegatesModule.delegatesListCache[round]).to.deep.equal(
					delegateListArray
				);
			});
		});

		describe('#clearDelegateListCache', () => {
			it('should clear delegatesModule.delegateListCache object.', async () => {
				// Arrange
				const initialSate = {
					1: ['j', 'k', 'l'],
					2: ['x', 'y', 'z'],
				};
				delegatesModule.delegatesListCache = { ...initialSate };

				// Act
				delegatesModule.clearDelegateListCache();

				// Assert
				expect(delegatesModule.delegatesListCache).to.deep.equal({});
			});

			it('should not mutate empty delegatesModule.delegateListCache object.', async () => {
				// Arrange
				delegatesModule.delegatesListCache = {};

				// Act
				delegatesModule.clearDelegateListCache();

				// Assert
				expect(delegatesModule.delegatesListCache).to.deep.equal({});
			});
		});
	});

	describe('#getKeysSortByVote', () => {
		const mockAccounts = [
			{
				address: '123L',
				publicKey: 'pk1',
			},
			{
				address: '456L',
				publicKey: 'pk2',
			},
		];
		const mockTX = { name: 'fake' };

		beforeEach(async () => {
			mockStorage.entities.Account.get.resolves(mockAccounts);
		});

		it('should call Account.get with expected options', async () => {
			// Act
			await getKeysSortByVote(mockStorage, activeDelegates, mockTX);
			// Assert
			expect(mockStorage.entities.Account.get).to.be.calledWithExactly(
				{ isDelegate: true },
				{
					limit: 101,
					sort: ['vote:desc', 'publicKey:asc'],
				},
				mockTX
			);
		});

		it('should return publicKeys which obtained from storage account', async () => {
			// Act
			const publicKeys = await getKeysSortByVote(
				mockStorage,
				activeDelegates,
				mockTX
			);
			expect(publicKeys).to.eql(['pk1', 'pk2']);
		});
	});

	describe('#getDelegatesFromPreviousRound', () => {
		const mockDelegates = [
			{
				publicKey: 'pk1',
			},
			{
				publicKey: 'pk2',
			},
		];
		const mockTX = { name: 'fake' };

		beforeEach(async () => {
			mockStorage.entities.Round.getDelegatesSnapshot.resolves(mockDelegates);
		});

		it('should call Rounds.getDelegatesSnapshot with expected options', async () => {
			// Act
			await getDelegatesFromPreviousRound(mockStorage, activeDelegates, mockTX);
			// Assert
			expect(
				mockStorage.entities.Round.getDelegatesSnapshot
			).to.be.calledWithExactly(101, mockTX);
		});

		it('should return publicKeys which obtained from storage account', async () => {
			// Act
			const publicKeys = await getDelegatesFromPreviousRound(
				mockStorage,
				activeDelegates,
				mockTX
			);
			expect(publicKeys).to.eql(['pk1', 'pk2']);
		});
	});

	describe('#validateBlockSlot', () => {
		const mockDelegateList = new Array(101).fill(0).map((_, i) => `pk_${i}`);

		it('should return true when generator matches delegateId', async () => {
			// Arrange
			const mockBlock = {
				timestamp: 10,
				generatorPublicKey: 'pk_1',
			};
			// Act
			const result = validateBlockSlot(
				mockBlock,
				slots,
				mockDelegateList,
				activeDelegates
			);
			// Assert
			expect(result).to.be.true;
		});

		it('should throw an error if generator does not match correct delegateId', async () => {
			// Arrange
			const mockBlock = {
				timestamp: 20,
				generatorPublicKey: 'pk_1',
			};
			// Act
			expect(
				validateBlockSlot.bind(
					null,
					mockBlock,
					slots,
					mockDelegateList,
					activeDelegates
				)
			).to.throw('Failed to verify slot: 2');
		});
	});
});
