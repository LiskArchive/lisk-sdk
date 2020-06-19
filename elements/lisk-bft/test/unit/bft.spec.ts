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

import { codec } from '@liskhq/lisk-codec';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { createFakeBlockHeader } from '../fixtures/blocks';
import {
	FinalityManager,
	CONSENSUS_STATE_DELEGATE_LEDGER_KEY,
	BFTDelegateLedgerSchema,
} from '../../src/finality_manager';

import {
	BFT,
	CONSENSUS_STATE_FINALIZED_HEIGHT_KEY,
	BlockHeader,
	Chain,
	DPoS,
	BFTPersistedValues,
	BFTFinalizedHeightCodecSchema,
} from '../../src';
import { StateStoreMock } from '../utils/state_store_mock';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const extractBFTInfo = (bft: BFT) => ({
	finalizedHeight: bft.finalizedHeight,
	maxHeightPrevoted: bft.maxHeightPrevoted,
	preVotes: { ...(bft.finalityManager as any).preVotes },
	preCommits: { ...(bft.finalityManager as any).preCommits },
	state: { ...(bft.finalityManager as any).state },
});

const generateBlocks = ({
	startHeight,
	numberOfBlocks,
}: {
	readonly startHeight: number;
	readonly numberOfBlocks: number;
}): BlockHeader[] => {
	return new Array(numberOfBlocks).fill(0).map((_v, index) => {
		const height = startHeight + index;
		return createFakeBlockHeader({ height, version: 2 });
	});
};

describe('bft', () => {
	describe('BFT', () => {
		let activeDelegates: number;
		let startingHeight: number;
		let bftParams: {
			readonly chain: Chain;
			readonly dpos: DPoS;
			readonly activeDelegates: number;
			readonly startingHeight: number;
		};

		let chainStub: {
			slots: {
				getSlotNumber: jest.Mock;
				isWithinTimeslot: jest.Mock;
				timeSinceGenesis: jest.Mock;
			};
		};
		let dposStub: {
			getMinActiveHeight: jest.Mock;
			isStandbyDelegate: jest.Mock;
		};
		let lastBlock: BlockHeader;

		beforeEach(() => {
			lastBlock = createFakeBlockHeader({ height: 1, version: 2 });
			chainStub = {
				slots: {
					getSlotNumber: jest.fn(),
					isWithinTimeslot: jest.fn(),
					timeSinceGenesis: jest.fn(),
				},
			};

			dposStub = {
				getMinActiveHeight: jest.fn(),
				isStandbyDelegate: jest.fn(),
			};
			activeDelegates = 101;
			startingHeight = 0;
			bftParams = {
				chain: chainStub,
				dpos: dposStub,
				activeDelegates,
				startingHeight,
			};
		});

		describe('#constructor', () => {
			it('should create instance of BFT', () => {
				expect(new BFT(bftParams)).toBeInstanceOf(BFT);
			});

			it('should assign all parameters correctly', () => {
				const bft = new BFT(bftParams);

				expect(bft.finalityManager).toBeUndefined();
				expect((bft as any)._chain).toBe(chainStub);
				expect((bft as any)._dpos).toBe(dposStub);
				expect(bft.constants).toEqual({ activeDelegates, startingHeight });
			});
		});

		describe('#init', () => {
			it('should initialize finality manager', async () => {
				const stateStore = new StateStoreMock();
				const bft = new BFT(bftParams);

				await bft.init(stateStore);

				expect(bft.finalityManager).toBeInstanceOf(FinalityManager);
			});

			it('should set the finality height to the value from chain state', async () => {
				const finalizedHeight = 5;
				const stateStore = new StateStoreMock(
					[],
					{
						[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: codec.encode(
							BFTFinalizedHeightCodecSchema,
							{ finalizedHeight },
						),
					},
					{ lastBlockHeaders: [lastBlock] },
				);
				const bft = new BFT(bftParams);

				await bft.init(stateStore);

				expect(bft.finalizedHeight).toEqual(finalizedHeight);
			});
		});

		describe('#addNewBlock', () => {
			const block1 = createFakeBlockHeader({ height: 2, version: 2 });
			const lastFinalizedHeight = 5;
			const delegateAddress = getAddressFromPublicKey(
				block1.generatorPublicKey,
			);
			const delegateLedger = {
				delegates: [
					{
						address: delegateAddress,
						maxPreVoteHeight: 1,
						maxPreCommitHeight: 0,
					},
				],
				ledger: [
					{
						height: block1.height,
						preVotes: 1,
						preCommits: 0,
					},
				],
			};

			let bft: BFT;
			let stateStore: StateStoreMock;

			beforeEach(async () => {
				stateStore = new StateStoreMock(
					[],
					{
						[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: codec.encode(
							BFTFinalizedHeightCodecSchema,
							{ finalizedHeight: lastFinalizedHeight },
						),
						[CONSENSUS_STATE_DELEGATE_LEDGER_KEY]: codec.encode(
							BFTDelegateLedgerSchema,
							delegateLedger,
						),
					},
					{ lastBlockHeaders: [lastBlock] },
				);

				bft = new BFT(bftParams);
				await bft.init(stateStore);
			});

			describe('when valid block which does not change the finality is added', () => {
				it('should update the latest finalized height to storage', async () => {
					await bft.addNewBlock(block1, stateStore);
					const finalizedHeightBuffer =
						(await stateStore.consensus.get(
							CONSENSUS_STATE_FINALIZED_HEIGHT_KEY,
						)) ?? Buffer.from('00');

					const { finalizedHeight } = codec.decode<BFTPersistedValues>(
						BFTFinalizedHeightCodecSchema,
						finalizedHeightBuffer,
					);

					expect(finalizedHeight).toEqual(lastFinalizedHeight);
				});
			});
		});

		describe('#reset', () => {
			it('should reset headers and related stats to initial state except finality', async () => {
				// Arrange
				const stateStore = new StateStoreMock(
					[],
					{
						[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: codec.encode(
							BFTFinalizedHeightCodecSchema,
							{ finalizedHeight: 5 },
						),
					},
					{ lastBlockHeaders: [lastBlock] },
				);
				const bft = new BFT(bftParams);
				await bft.init(stateStore);
				const numberOfBlocks = 500;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				for (const block of blocks) {
					await bft.addNewBlock(
						{
							...block,
							asset: {
								...block.asset,
								maxHeightPrevoted: bft.finalityManager.chainMaxHeightPrevoted,
							},
						},
						stateStore,
					);
				}
				// const beforeResetInfo = extractBFTInfo(bft);

				// Act
				bft.reset();
				const afterResetInfo = extractBFTInfo(bft);

				// Assert
				// Finalized height should not change
				expect(afterResetInfo).toEqual({
					finalizedHeight: 5,
					maxHeightPrevoted: 0,
					preVotes: {},
					preCommits: {},
					state: {},
				});
			});
		});

		describe('#isBFTProtocolCompliant', () => {
			let bft: BFT;
			let blocks: BlockHeader[];
			let stateStore: StateStoreMock;

			beforeEach(async () => {
				// Arrange
				// Setup BFT module with blocks
				const numberOfBlocks = 101;
				blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});

				bft = new BFT(bftParams);
				stateStore = new StateStoreMock(
					[],
					{
						[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: codec.encode(
							BFTFinalizedHeightCodecSchema,
							{ finalizedHeight: 1 },
						),
					},
					{ lastBlockHeaders: blocks },
				);
				await bft.init(stateStore);
			});

			it('should THROW if block is not provided', () => {
				// Act & Assert
				expect(() =>
					bft.isBFTProtocolCompliant(undefined as any, stateStore),
				).toThrow('No block was provided to be verified');
			});

			it('should return TRUE when B.maxHeightPreviouslyForged is equal to 0', () => {
				// Arrange
				const block = {
					height: 102,
					generatorPublicKey: Buffer.from('zxc'),
					asset: {
						maxHeightPreviouslyForged: 0,
					},
				};

				// Act & Assert
				expect(
					bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
				).toBeTrue();
			});

			it('should return FALSE when B.maxHeightPreviouslyForged is equal to B.height', () => {
				// Arrange
				const block = {
					height: 203,
					asset: {
						maxHeightPreviouslyForged: 203,
					},
				};

				// Act & Assert
				expect(
					bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
				).toBeFalse();
			});

			it('should return FALSE when B.maxHeightPreviouslyForged is greater than B.height', () => {
				// Arrange
				const block = {
					height: 203,
					asset: {
						maxHeightPreviouslyForged: 204,
					},
				};

				// Act & Assert
				expect(
					bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
				).toBeFalse();
			});

			describe('when B.height - B.maxHeightPreviouslyForged is less than 303', () => {
				it('should return FALSE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', () => {
					// Arrange
					const block = {
						height: 403,
						generatorPublicKey: Buffer.from('zxc'),
						asset: {
							maxHeightPreviouslyForged: 101,
						},
					};

					// Act & Assert
					expect(
						bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
					).toBeFalse();
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', () => {
					// Arrange
					const block = {
						height: 403,
						generatorPublicKey: blocks[100].generatorPublicKey,
						asset: {
							maxHeightPreviouslyForged: 101,
						},
					};

					// Act & Assert
					expect(
						bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
					).toBeTrue();
				});
			});

			describe('when B.height - B.maxHeightPreviouslyForged is equal to 303', () => {
				it('should return FALSE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', () => {
					// Arrange
					const block = {
						height: 404,
						generatorPublicKey: Buffer.from('zxc'),
						asset: {
							maxHeightPreviouslyForged: 101,
						},
					};

					// Act & Assert
					expect(
						bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
					).toBeFalse();
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', () => {
					// Arrange
					const block = {
						height: 404,
						generatorPublicKey: blocks[100].generatorPublicKey,
						asset: {
							maxHeightPreviouslyForged: 101,
						},
					};

					// Act & Assert
					expect(
						bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
					).toBeTrue();
				});
			});

			describe('when B.height - B.maxHeightPreviouslyForged is greater than 303', () => {
				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', () => {
					// Arrange
					const block = {
						height: 405,
						generatorPublicKey: Buffer.from('zxc'),
						asset: {
							maxHeightPreviouslyForged: 101,
						},
					};

					// Act & Assert
					expect(
						bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
					).toBeTrue();
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', () => {
					// Arrange
					const block = {
						height: 405,
						generatorPublicKey: blocks[100].generatorPublicKey,
						asset: {
							maxHeightPreviouslyForged: 101,
						},
					};

					// Act & Assert
					expect(
						bft.isBFTProtocolCompliant(block as BlockHeader, stateStore),
					).toBeTrue();
				});
			});
		});
	});
});
