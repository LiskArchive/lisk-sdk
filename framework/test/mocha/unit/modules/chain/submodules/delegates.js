/*
 * Copyright © 2018 Lisk Foundation
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
	getPrivateAndPublicKeyBytesFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const {
	Delegates,
	validateBlockSlot,
	getKeysSortByVote,
	getDelegatesFromPreviousRound,
} = require('../../../../../../src/modules/chain/rounds/delegates');
const delegatesRoundsList = require('../../../../data/delegates_rounds_list.json');
const { BlockSlots } = require('../../../../../../src/modules/chain/blocks');

const exceptions = global.exceptions;

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

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('#Delegate', () => {
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
			await getKeysSortByVote(mockStorage, mockTX);
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
			const publicKeys = await getKeysSortByVote(mockStorage, mockTX);
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
			await getDelegatesFromPreviousRound(mockStorage, mockTX);
			// Assert
			expect(
				mockStorage.entities.Round.getDelegatesSnapshot
			).to.be.calledWithExactly(101, mockTX);
		});

		it('should return publicKeys which obtained from storage account', async () => {
			// Act
			const publicKeys = await getDelegatesFromPreviousRound(
				mockStorage,
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
			const result = validateBlockSlot(mockBlock, slots, mockDelegateList);
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
				validateBlockSlot.bind(null, mockBlock, slots, mockDelegateList)
			).to.throw('Failed to verify slot: 2');
		});
	});

	describe('#getDelegateKeypairForCurrentSlot', () => {
		const genesis1 = {
			passphrase:
				'robust swift grocery peasant forget share enable convince deputy road keep cheap',
			publicKey:
				'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
		};

		const genesis2 = {
			passphrase:
				'weapon van trap again sustain write useless great pottery urge month nominee',
			publicKey:
				'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
		};

		const genesis3 = {
			passphrase:
				'course genuine appear elite library fabric armed chat pipe scissors mask novel',
			publicKey:
				'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
		};

		let genesis1Keypair;
		let genesis2Keypair;
		let genesis3Keypair;
		let keypairs;

		beforeEach(async () => {
			const genesis1KeypairBuffer = getPrivateAndPublicKeyBytesFromPassphrase(
				genesis1.passphrase
			);
			genesis1Keypair = {
				publicKey: genesis1KeypairBuffer.publicKeyBytes,
				privateKey: genesis1KeypairBuffer.privateKeyBytes,
			};
			const genesis2KeypairBuffer = getPrivateAndPublicKeyBytesFromPassphrase(
				genesis2.passphrase
			);
			genesis2Keypair = {
				publicKey: genesis2KeypairBuffer.publicKeyBytes,
				privateKey: genesis2KeypairBuffer.privateKeyBytes,
			};
			const genesis3KeypairBuffer = getPrivateAndPublicKeyBytesFromPassphrase(
				genesis3.passphrase
			);
			genesis3Keypair = {
				publicKey: genesis3KeypairBuffer.publicKeyBytes,
				privateKey: genesis3KeypairBuffer.privateKeyBytes,
			};

			keypairs = {
				[genesis1.publicKey]: genesis1Keypair,
				[genesis2.publicKey]: genesis2Keypair,
				[genesis3.publicKey]: genesis3Keypair,
			};
		});

		it('should return genesis_1 keypair for slot N where (N % 101 === 35) in the first round', async () => {
			// For round 1, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 35, 53 and 16 respectively.
			const currentSlot = 35;
			const round = 1;

			sinonSandbox
				.stub(delegatesModule, 'generateDelegateList')
				.withArgs(round)
				.resolves(delegatesRoundsList[round]);

			const {
				publicKey,
				privateKey,
			} = await delegatesModule.getDelegateKeypairForCurrentSlot(
				keypairs,
				currentSlot,
				round
			);
			expect(publicKey).to.deep.equal(genesis1Keypair.publicKey);
			expect(privateKey).to.deep.equal(genesis1Keypair.privateKey);
		});

		it('should return genesis_2 keypair for slot N where (N % 101 === 73) in the second round', async () => {
			// For round 2, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 50, 73 and 100 respectively.
			const currentSlot = 578;
			const round = 2;

			sinonSandbox
				.stub(delegatesModule, 'generateDelegateList')
				.resolves(delegatesRoundsList[round]);

			const {
				publicKey,
				privateKey,
			} = await delegatesModule.getDelegateKeypairForCurrentSlot(
				keypairs,
				currentSlot,
				round
			);
			expect(publicKey).to.deep.equal(genesis2Keypair.publicKey);
			expect(privateKey).to.deep.equal(genesis2Keypair.privateKey);
		});

		it('should return genesis_3 keypair for slot N where (N % 101 === 41) in the third round', async () => {
			// For round 3, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 12, 16 and 41 respectively.
			const currentSlot = 1051;
			const round = 3;

			sinonSandbox
				.stub(delegatesModule, 'generateDelegateList')
				.resolves(delegatesRoundsList[round]);

			const {
				publicKey,
				privateKey,
			} = await delegatesModule.getDelegateKeypairForCurrentSlot(
				keypairs,
				currentSlot,
				round
			);
			expect(publicKey).to.deep.equal(genesis3Keypair.publicKey);
			expect(privateKey).to.deep.equal(genesis3Keypair.privateKey);
		});

		it('should return null when the slot does not belong to a public key set in keypairs', async () => {
			// For round 4, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 93, 68 and 87 respectively.
			// Any other slot should return null as genesis_1, genesis_2 and genesis_3 are the only one forging delegates set for this test
			const currentSlot = 1;
			const round = 4;

			sinonSandbox
				.stub(delegatesModule, 'generateDelegateList')
				.resolves(delegatesRoundsList[round]);

			const keyPair = await delegatesModule.getDelegateKeypairForCurrentSlot(
				keypairs,
				currentSlot,
				round
			);
			expect(keyPair).to.be.null;
		});

		it('should return error when `generateDelegateList` fails', async () => {
			const currentSlot = 1;
			const round = 4;

			const expectedError = new Error('generateDelegateList error');

			sinonSandbox
				.stub(delegatesModule, 'generateDelegateList')
				.rejects(expectedError);

			try {
				await delegatesModule.getDelegateKeypairForCurrentSlot(
					keypairs,
					currentSlot,
					round
				);
			} catch (error) {
				expect(error).to.equal(expectedError);
			}
		});
	});
});
