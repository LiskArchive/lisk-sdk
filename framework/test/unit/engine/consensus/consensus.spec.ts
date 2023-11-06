/*
 * Copyright © 2021 Lisk Foundation
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

import { Block, BlockAssets, Chain, StateStore, Event, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { when } from 'jest-when';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { InMemoryDatabase } from '@liskhq/lisk-db';
import { utils, address as cryptoAddress, bls, legacy } from '@liskhq/lisk-cryptography';
import { ApplyPenaltyError } from '../../../../src/errors';
import { Consensus } from '../../../../src/engine/consensus/consensus';
import { NetworkEndpoint } from '../../../../src/engine/consensus/network_endpoint';
import { LegacyNetworkEndpoint } from '../../../../src/engine/legacy/network_endpoint';
import { Synchronizer } from '../../../../src/engine/consensus/synchronizer';
import {
	ApplyPenaltyAndRestartError,
	RestartError,
	AbortError,
} from '../../../../src/engine/consensus/synchronizer/errors';
import { Network } from '../../../../src/engine/network';
import { loggerMock } from '../../../../src/testing/mocks';
import {
	createFakeBlockHeader,
	createValidDefaultBlock,
	defaultChainID,
	genesisBlock,
} from '../../../fixtures';
import * as forkchoice from '../../../../src/engine/consensus/fork_choice/fork_choice_rule';
import { postBlockEventSchema } from '../../../../src/engine/consensus/schema';
import { BFTModule } from '../../../../src/engine/bft';
import { ABI, TransactionExecutionResult, TransactionVerifyResult } from '../../../../src/abi';
import {
	CONSENSUS_EVENT_BLOCK_BROADCAST,
	NETWORK_EVENT_POST_BLOCK,
} from '../../../../src/engine/consensus/constants';

describe('consensus', () => {
	const genesis = genesisBlock() as unknown as Block;
	let consensus: Consensus;
	let chain: Chain;
	let network: Network;
	let bft: BFTModule;
	let abi: ABI;

	let dbMock: any;

	beforeEach(async () => {
		const lastBlock = await createValidDefaultBlock({ header: { height: 1 } });
		chain = {
			genesisBlockExist: jest.fn().mockResolvedValue(true),
			newStateStore: jest.fn().mockResolvedValue({}),
			applyGenesisBlock: jest.fn(),
			saveBlock: jest.fn(),
			init: jest.fn(),
			finalizedHeight: 0,
			loadLastBlocks: jest.fn(),
			lastBlock,
			chainID: Buffer.from('network-identifier'),
			validateBlock: jest.fn(),
			validateTransaction: jest.fn(),
			removeBlock: jest.fn(),
			dataAccess: {
				getBlockHeaderByHeight: jest.fn().mockResolvedValue(lastBlock.header),
			},
			genesisHeight: 0,
		} as unknown as Chain;
		network = {
			registerEndpoint: jest.fn(),
			registerHandler: jest.fn(),
			applyPenaltyOnPeer: jest.fn(),
			send: jest.fn(),
			applyNodeInfo: jest.fn(),
		} as unknown as Network;
		bft = {
			init: jest.fn(),
			initGenesisState: jest.fn(),
			beforeTransactionsExecute: jest.fn(),
			method: {
				getGeneratorAtTimestamp: jest.fn(),
				impliesMaximalPrevotes: jest.fn().mockResolvedValue(true),
				getBFTHeights: jest
					.fn()
					.mockResolvedValue({ maxHeghgtPrevoted: 0, maxHeightPrecommitted: 0 }),
				isHeaderContradictingChain: jest.fn(),
				getBFTParameters: jest.fn(),
				setBFTParameters: jest.fn(),
				getSlotNumber: jest.fn(),
			},
		} as never;
		abi = {
			beforeTransactionsExecute: jest.fn().mockResolvedValue({ events: [] }),
			afterTransactionsExecute: jest.fn().mockResolvedValue({
				events: [],
				nextValidators: [],
				precommitThreshold: 0,
				certificateThreshold: 0,
			}),
			clear: jest.fn(),
			revert: jest.fn(),
			commit: jest.fn().mockResolvedValue({ stateRoot: utils.getRandomBytes(32) }),
			verifyAssets: jest.fn(),
			verifyTransaction: jest.fn(),
			executeTransaction: jest.fn().mockResolvedValue({ events: [] }),
			initStateMachine: jest.fn().mockResolvedValue({ contextID: utils.getRandomBytes(32) }),
			initGenesisState: jest.fn().mockResolvedValue({
				events: [],
				nextValidators: [],
				precommitThreshold: 0,
				certificateThreshold: 0,
			}),
		} as never;
		consensus = new Consensus({
			abi,
			chain,
			network,
			bft,
			genesisConfig: {
				blockTime: 10,
			} as any,
		});
		dbMock = {
			get: jest.fn(),
			put: jest.fn(),
			batch: jest.fn(),
		};
		genesis.validateGenesis = jest.fn();
	});

	const initConsensus = async () => {
		return consensus.init({
			logger: loggerMock,
			db: dbMock,
			genesisBlock: genesis,
			legacyDB: dbMock,
		});
	};

	describe('init', () => {
		beforeEach(() => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
		});

		it('should instantiate synchronizer', async () => {
			await initConsensus();
			expect(consensus['_synchronizer']).toBeInstanceOf(Synchronizer);
		});

		it('should instantiate endpoint', async () => {
			await initConsensus();
			expect(consensus['_endpoint']).toBeInstanceOf(NetworkEndpoint);
		});

		it('should instantiate legacy endpoint', async () => {
			await initConsensus();
			expect(consensus['_legacyEndpoint']).toBeInstanceOf(LegacyNetworkEndpoint);
		});

		it('should register endpoints', async () => {
			await initConsensus();
			expect(network.registerEndpoint).toHaveBeenCalledTimes(4);
		});

		it('should register network handlers', async () => {
			await initConsensus();
			expect(network.registerHandler).toHaveBeenCalledTimes(3);
		});

		it('should execute genesis block if genesis block does not exist', async () => {
			// Arrange
			jest.spyOn(consensus['_bft'].method, 'getBFTParameters').mockResolvedValue({
				validatorsHash: genesis.header.validatorsHash,
			} as never);
			jest.spyOn(consensus, '_verifyEventRoot' as never);
			jest.spyOn(consensus, '_verifyValidatorsHash' as never);
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(false);
			await initConsensus();

			expect(consensus['_verifyEventRoot']).toHaveBeenCalledTimes(1);
			expect(consensus['_verifyValidatorsHash']).toHaveBeenCalledTimes(1);
			expect(genesis.validateGenesis).toHaveBeenCalledTimes(1);
			expect(chain.saveBlock).toHaveBeenCalledTimes(1);
			expect(chain.loadLastBlocks).toHaveBeenCalledTimes(1);
		});

		it('should not execute genesis block if it exists in chain', async () => {
			await initConsensus();
			expect(chain.saveBlock).not.toHaveBeenCalled();
			expect(chain.loadLastBlocks).toHaveBeenCalledTimes(1);
		});

		it('should fail initialization if eventRoot is invalid', async () => {
			// Arrange
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(false);
			jest.spyOn(consensus['_bft'].method, 'getBFTParameters').mockResolvedValue({
				validatorsHash: genesis.header.validatorsHash,
			} as never);
			jest
				.spyOn(consensus, '_verifyEventRoot' as never)
				.mockRejectedValue(new Error('Event root is not valid for the block') as never);

			await expect(initConsensus()).rejects.toThrow('Event root is not valid for the block');
		});

		it('should fail initialization if validatorsHash is invalid', async () => {
			// Arrange
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(false);
			jest.spyOn(consensus['_bft'].method, 'getBFTParameters').mockResolvedValue({
				validatorsHash: utils.getRandomBytes(32),
			} as never);
			await expect(initConsensus()).rejects.toThrow('Genesis block validators hash is invalid');
		});
	});

	describe('certifySingleCommit', () => {
		const passphrase = Mnemonic.generateMnemonic(256);
		const { publicKey } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
		const address = cryptoAddress.getAddressFromPublicKey(publicKey);
		const blsSK = bls.generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
		const blsPK = bls.getPublicKeyFromPrivateKey(blsSK);
		const blockHeader = createFakeBlockHeader({ height: 303 });

		beforeEach(async () => {
			await initConsensus();

			jest.spyOn(consensus['_commitPool'], 'addCommit');
		});

		it('should add created single commit to the pool', () => {
			consensus.certifySingleCommit(blockHeader, {
				address,
				blsPublicKey: blsPK,
				blsSecretKey: blsSK,
			});

			expect(consensus['_commitPool'].addCommit).toHaveBeenCalledWith(
				{
					blockID: blockHeader.id,
					validatorAddress: address,
					certificateSignature: expect.any(Buffer),
					height: 303,
				},
				true,
			);
		});
	});

	describe('onBlockReceive', () => {
		const peerID = 'peer-id';
		beforeEach(async () => {
			await initConsensus();
		});

		it('should not execute when syncing', async () => {
			jest.spyOn(consensus, 'syncing').mockReturnValue(true);
			await consensus.onBlockReceive(Buffer.alloc(0), peerID);
			expect(network.applyPenaltyOnPeer).not.toHaveBeenCalled();
		});

		it('should apply penalty when data is not Buffer', async () => {
			await consensus.onBlockReceive('not buffer', peerID);
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledTimes(1);
		});

		it('should apply penalty on the peer when data format is invalid', async () => {
			const invalidBytes = Buffer.from([244, 21, 21]);

			await expect(consensus.onBlockReceive(invalidBytes, peerID)).rejects.toThrow();
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledTimes(1);
		});

		it('should apply penalty on the peer when execute fail with penalty error', async () => {
			const validBlock = await createValidDefaultBlock();
			const encodedValidBlock = validBlock.getBytes();

			jest.spyOn(consensus, '_execute' as any).mockRejectedValue(new ApplyPenaltyError());

			await expect(consensus.onBlockReceive(encodedValidBlock, peerID)).rejects.toThrow();
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledTimes(1);
		});

		it('should not apply penalty on the peer when execute fail with other error', async () => {
			const validBlock = await createValidDefaultBlock();
			const encodedValidBlock = codec.encode(postBlockEventSchema, {
				block: validBlock.getBytes(),
			});

			jest.spyOn(consensus, '_execute' as any).mockRejectedValue(new Error());

			await expect(consensus.onBlockReceive(encodedValidBlock, peerID)).rejects.toThrow();
			expect(network.applyPenaltyOnPeer).not.toHaveBeenCalled();
		});

		it('should execute block', async () => {
			const validBlock = await createValidDefaultBlock();
			const encodedValidBlock = codec.encode(postBlockEventSchema, {
				block: validBlock.getBytes(),
			});
			jest.spyOn(consensus, '_execute' as any).mockResolvedValue(undefined);

			await expect(consensus.onBlockReceive(encodedValidBlock, peerID)).resolves.toBeUndefined();
			expect(network.applyPenaltyOnPeer).not.toHaveBeenCalled();
			expect(consensus['_execute']).toHaveBeenCalledTimes(1);
		});

		describe('when block is executed', () => {
			let block: Block;
			let input: Buffer;

			beforeEach(async () => {
				block = await createValidDefaultBlock({ header: { height: 2 } });
				input = codec.encode(postBlockEventSchema, { block: block.getBytes() });
			});

			describe('when the fork step returns unknown fork status', () => {
				it('should throw an error', async () => {
					jest.spyOn(forkchoice, 'forkChoice').mockReturnValue('unknown' as any);
					await expect(consensus.onBlockReceive(input, peerID)).rejects.toThrow(
						'Unknown fork status',
					);
				});
			});

			describe('when the fork step returns ForkStatus.IDENTICAL_BLOCK', () => {
				beforeEach(async () => {
					jest
						.spyOn(forkchoice, 'forkChoice')
						.mockReturnValue(forkchoice.ForkStatus.IDENTICAL_BLOCK);
					jest.spyOn(consensus, '_verify' as any);
					jest.spyOn(consensus, '_executeValidated' as any);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should not validate block', () => {
					expect(consensus['_verify']).not.toHaveBeenCalled();
				});

				it('should not execute block', () => {
					expect(consensus['_executeValidated']).not.toHaveBeenCalled();
				});
			});

			describe('when the fork step returns ForkStatus.DOUBLE_FORGING', () => {
				beforeEach(async () => {
					jest
						.spyOn(forkchoice, 'forkChoice')
						.mockReturnValue(forkchoice.ForkStatus.DOUBLE_FORGING);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_verify' as any).mockResolvedValue(true);
					jest.spyOn(consensus, '_executeValidated' as any);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should not validate block', () => {
					expect(consensus['_verify']).not.toHaveBeenCalled();
				});

				it('should not execute block', () => {
					expect(consensus['_executeValidated']).not.toHaveBeenCalled();
				});

				it('should publish fork event', () => {
					expect(consensus.events.emit).toHaveBeenCalledTimes(2);
				});
			});

			describe('when the fork step returns ForkStatus.TIE_BREAK and success to execute', () => {
				beforeEach(async () => {
					jest.spyOn(forkchoice, 'forkChoice').mockReturnValue(forkchoice.ForkStatus.TIE_BREAK);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_executeValidated' as any).mockResolvedValue(undefined);
					jest.spyOn(consensus, 'finalizedHeight').mockReturnValue(0);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should publish fork event', () => {
					expect(consensus.events.emit).toHaveBeenCalledTimes(3);
				});

				it('should validate block', () => {
					expect(chain.validateBlock).toHaveBeenCalled();
				});

				it('should revert the last block', () => {
					expect(chain.removeBlock).toHaveBeenCalledTimes(1);
				});

				it('should execute the block', () => {
					expect(consensus['_executeValidated']).toHaveBeenCalledWith(block);
				});
			});

			describe('when the fork step returns ForkStatus.TIE_BREAK and fail to execute', () => {
				beforeEach(async () => {
					jest.spyOn(forkchoice, 'forkChoice').mockReturnValue(forkchoice.ForkStatus.TIE_BREAK);
					jest.spyOn(consensus.events, 'emit');
					jest
						.spyOn(consensus, '_executeValidated' as any)
						.mockRejectedValueOnce(new Error('invalid block'));
					jest.spyOn(consensus, '_executeValidated' as any).mockResolvedValueOnce(undefined);
					jest.spyOn(consensus, 'finalizedHeight').mockReturnValue(0);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should publish fork event', () => {
					expect(consensus.events.emit).toHaveBeenCalledTimes(3);
				});

				it('should validate block', () => {
					expect(chain.validateBlock).toHaveBeenCalled();
				});

				it('should revert the last block', () => {
					expect(chain.removeBlock).toHaveBeenCalledTimes(1);
				});

				it('should execute the last block', () => {
					expect(consensus['_executeValidated']).toHaveBeenCalledWith(chain.lastBlock, {
						skipBroadcast: true,
					});
					expect(consensus['_executeValidated']).toHaveBeenCalledTimes(2);
				});
			});

			describe('when the fork step returns ForkStatus.DIFFERENT_CHAIN', () => {
				beforeEach(async () => {
					jest
						.spyOn(forkchoice, 'forkChoice')
						.mockReturnValue(forkchoice.ForkStatus.DIFFERENT_CHAIN);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_executeValidated' as any);
					jest.spyOn(consensus['_synchronizer'], 'run').mockResolvedValue(undefined);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should not validate block', () => {
					expect(chain.validateBlock).not.toHaveBeenCalled();
				});

				it('should not execute block', () => {
					expect(consensus['_executeValidated']).not.toHaveBeenCalled();
				});

				it('should publish fork event', () => {
					expect(consensus.events.emit).toHaveBeenCalledTimes(2);
				});

				it('should start sync', () => {
					expect(consensus['_synchronizer'].run).toHaveBeenCalledTimes(1);
				});
			});

			describe('when fork step returns ForkStatus.DIFFERENT_CHAIN and synchronizer fail once with ApplyPenaltyAndRestartError', () => {
				beforeEach(async () => {
					jest
						.spyOn(forkchoice, 'forkChoice')
						.mockReturnValue(forkchoice.ForkStatus.DIFFERENT_CHAIN);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_executeValidated' as any);
					jest
						.spyOn(consensus['_synchronizer'], 'run')
						.mockRejectedValueOnce(new ApplyPenaltyAndRestartError('fail', 'reason'));
					jest.spyOn(consensus['_synchronizer'], 'run').mockResolvedValueOnce();
					await consensus.onBlockReceive(input, peerID);
				});

				it('should call sync again after applying penalty', () => {
					expect(consensus['_synchronizer'].run).toHaveBeenCalledTimes(2);
					expect(network.applyPenaltyOnPeer).toHaveBeenCalledTimes(1);
				});
			});

			describe('when fork step returns ForkStatus.DIFFERENT_CHAIN and synchronizer fail once with RestartError', () => {
				beforeEach(async () => {
					jest
						.spyOn(forkchoice, 'forkChoice')
						.mockReturnValue(forkchoice.ForkStatus.DIFFERENT_CHAIN);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_executeValidated' as any);
					jest
						.spyOn(consensus['_synchronizer'], 'run')
						.mockRejectedValueOnce(new RestartError('fail'));
					jest.spyOn(consensus['_synchronizer'], 'run').mockResolvedValueOnce();
					await consensus.onBlockReceive(input, peerID);
				});

				it('should call sync again after applying penalty', () => {
					expect(consensus['_synchronizer'].run).toHaveBeenCalledTimes(2);
					expect(network.applyPenaltyOnPeer).not.toHaveBeenCalled();
				});
			});

			describe('when fork step returns ForkStatus.DIFFERENT_CHAIN and synchronizer fail once with AbortError', () => {
				beforeEach(async () => {
					jest
						.spyOn(forkchoice, 'forkChoice')
						.mockReturnValue(forkchoice.ForkStatus.DIFFERENT_CHAIN);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_executeValidated' as any);
					jest
						.spyOn(consensus['_synchronizer'], 'run')
						.mockRejectedValueOnce(new AbortError('fail'));
					jest.spyOn(consensus['_synchronizer'], 'run').mockResolvedValueOnce();
					await consensus.onBlockReceive(input, peerID);
				});

				it('should call sync again after applying penalty', () => {
					expect(consensus['_synchronizer'].run).toHaveBeenCalledTimes(1);
					expect(network.applyPenaltyOnPeer).not.toHaveBeenCalled();
				});
			});

			describe('when fork step returns ForkStatus.DIFFERENT_CHAIN and synchronizer fail once with Error', () => {
				beforeEach(() => {
					jest
						.spyOn(forkchoice, 'forkChoice')
						.mockReturnValue(forkchoice.ForkStatus.DIFFERENT_CHAIN);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_executeValidated' as any);
					jest.spyOn(consensus['_synchronizer'], 'run').mockRejectedValueOnce(new Error('fail'));
					jest.spyOn(consensus['_synchronizer'], 'run').mockResolvedValueOnce();
				});

				it('should call sync again after applying penalty', async () => {
					await expect(consensus.onBlockReceive(input, peerID)).rejects.toThrow();
					expect(consensus['_synchronizer'].run).toHaveBeenCalledTimes(1);
					expect(network.applyPenaltyOnPeer).not.toHaveBeenCalled();
				});
			});

			describe('when the fork step returns ForkStatus.DISCARD', () => {
				beforeEach(async () => {
					jest.spyOn(forkchoice, 'forkChoice').mockReturnValue(forkchoice.ForkStatus.DISCARD);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_executeValidated' as any).mockResolvedValue(undefined);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should not validate block', () => {
					expect(chain.validateBlock).not.toHaveBeenCalled();
				});

				it('should not execute block', () => {
					expect(consensus['_executeValidated']).not.toHaveBeenCalled();
				});

				it('should publish fork event', () => {
					expect(consensus.events.emit).toHaveBeenCalledTimes(2);
				});
			});

			describe('when the fork step returns ForkStatus.VALID_BLOCK', () => {
				beforeEach(async () => {
					jest.spyOn(forkchoice, 'forkChoice').mockReturnValue(forkchoice.ForkStatus.VALID_BLOCK);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_executeValidated' as any).mockResolvedValue(undefined);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should validate block', () => {
					expect(chain.validateBlock).toHaveBeenCalled();
				});

				it('should execute block', () => {
					expect(consensus['_executeValidated']).toHaveBeenCalledWith(block);
					expect(consensus['_executeValidated']).toHaveBeenCalledTimes(1);
				});
			});
		});
	});
	describe('execute', () => {
		beforeEach(async () => {
			await initConsensus();
		});

		it('should not throw error when block execution fail', async () => {
			const validBlock = await createValidDefaultBlock();

			jest.spyOn(consensus, '_execute' as any).mockRejectedValue(new Error('some error'));

			await expect(consensus.execute(validBlock)).resolves.toBeUndefined();
		});
	});

	describe('_execute', () => {
		let block: Block;
		let stateStore: StateStore;

		beforeEach(async () => {
			await initConsensus();
			jest.spyOn(abi, 'verifyTransaction').mockResolvedValue({
				result: TransactionVerifyResult.OK,
				errorMessage: '',
			});
		});

		describe('when skipBroadcast option is not specified', () => {
			beforeEach(async () => {
				block = await createValidDefaultBlock({
					header: {
						height: 2,
						previousBlockID: chain.lastBlock.header.id,
						timestamp: consensus['_chain'].lastBlock.header.timestamp + 10,
					},
					transactions: [
						new Transaction({
							command: 'exec',
							module: 'sample',
							fee: BigInt(200),
							nonce: BigInt(2),
							params: utils.getRandomBytes(100),
							senderPublicKey: utils.getRandomBytes(32),
							signatures: [utils.getRandomBytes(64)],
						}),
					],
				});
				stateStore = new StateStore(new InMemoryDatabase());
				jest.spyOn(bft.method, 'getBFTParameters').mockResolvedValue({
					validatorsHash: block.header.validatorsHash,
				} as never);
				consensus['_verifyEventRoot'] = jest.fn().mockReturnValue(undefined);
				jest.spyOn(consensus, '_verify' as any).mockResolvedValue(undefined);
			});

			it('should send encoded block to the network', async () => {
				jest.spyOn(consensus['_network'], 'send');

				await consensus['_executeValidated'](block);

				expect(consensus['_network'].send).toHaveBeenCalledWith({
					event: NETWORK_EVENT_POST_BLOCK,
					data: expect.any(Buffer),
				});
			});

			it('should emit CONSENSUS_EVENT_BLOCK_BROADCAST event', async () => {
				jest.spyOn(consensus.events, 'emit');

				await consensus['_executeValidated'](block);

				expect(consensus.events.emit).toHaveBeenCalledWith(CONSENSUS_EVENT_BLOCK_BROADCAST, {
					block: expect.any(Block),
				});
			});

			it('should include events from hooks', async () => {
				jest.spyOn(abi, 'beforeTransactionsExecute').mockResolvedValue({
					events: [
						{
							module: 'sample',
							name: 'init',
							data: Buffer.from([0, 0, 2]),
							topics: [Buffer.from([2])],
							height: 2,
							index: 0,
						},
					],
				});
				jest.spyOn(abi, 'afterTransactionsExecute').mockResolvedValue({
					events: [
						{
							module: 'sample',
							name: 'init',
							data: Buffer.from([0, 0, 1]),
							topics: [Buffer.from([3])],
							height: 2,
							index: 0,
						},
					],
					nextValidators: [],
					preCommitThreshold: BigInt(0),
					certificateThreshold: BigInt(0),
				});
				jest.spyOn(abi, 'executeTransaction').mockResolvedValue({
					result: TransactionExecutionResult.OK,
					events: [
						{
							module: 'sample',
							name: 'exec',
							data: Buffer.from([0, 0, 2]),
							topics: [utils.getRandomBytes(32)],
							height: 2,
							index: 0,
						},
					],
				});

				jest.spyOn(chain, 'saveBlock');

				await consensus['_executeValidated'](block);

				const savingEvents = (chain.saveBlock as jest.Mock).mock.calls[0][1];
				expect(savingEvents).toHaveLength(3);
				savingEvents.forEach((e: Event, i: number) => expect(e.toObject().index).toEqual(i));
			});
		});

		describe('block verification', () => {
			beforeEach(async () => {
				block = await createValidDefaultBlock({
					header: { height: 2, previousBlockID: chain.lastBlock.header.id },
				});
				stateStore = new StateStore(new InMemoryDatabase());
				jest.spyOn(chain, 'saveBlock').mockResolvedValue();
				jest.spyOn(consensus, 'finalizedHeight').mockReturnValue(0);
				jest.spyOn(bft.method, 'getBFTParameters').mockResolvedValue({
					validatorsHash: block.header.validatorsHash,
				} as never);
				jest.spyOn(consensus.events, 'emit');
				consensus['_db'] = dbMock;
				consensus['_verifyEventRoot'] = jest.fn().mockReturnValue(undefined);

				await initConsensus();
				jest.spyOn(consensus['_commitPool'], 'verifyAggregateCommit');
			});

			describe('timestamp', () => {
				it('should throw error when block timestamp is from future', () => {
					const invalidBlock = { ...block };

					jest.spyOn(bft.method, 'getSlotNumber').mockReturnValue(Math.floor(Date.now() / 10));

					(invalidBlock.header as any).timestamp = Math.floor((Date.now() + 10000) / 1000);

					expect(() => consensus['_verifyTimestamp'](invalidBlock as any)).toThrow(
						`Invalid timestamp ${
							invalidBlock.header.timestamp
						} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});

				it('should throw error when block slot is less than previous block slot', () => {
					const invalidBlock = { ...block };

					jest.spyOn(bft.method, 'getSlotNumber').mockReturnValue(Math.floor(Date.now() / 10));

					(invalidBlock.header as any).timestamp = Math.floor(Date.now() / 1000);

					(consensus['_chain'].lastBlock.header as any).timestamp = Math.floor(Date.now() / 1000);

					expect(() => consensus['_verifyTimestamp'](invalidBlock as any)).toThrow(
						`Invalid timestamp ${
							invalidBlock.header.timestamp
						} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});

				it('should be success when valid block timestamp', () => {
					(block.header as any).timestamp = Math.floor(Date.now() / 1000);

					expect(consensus['_verifyTimestamp'](block as any)).toBeUndefined();
				});
			});

			describe('height', () => {
				it('should throw error when block height is equal to last block height', () => {
					const invalidBlock = { ...block };
					(invalidBlock.header as any).height = consensus['_chain'].lastBlock.header.height;

					expect(() => consensus['_verifyBlockHeight'](invalidBlock as any)).toThrow(
						`Invalid height ${
							invalidBlock.header.height
						} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});
				it('should be success when block has [height===lastBlock.height+1]', () => {
					expect(consensus['_verifyBlockHeight'](block as any)).toBeUndefined();
				});
			});

			describe('previousBlockID', () => {
				it('should throw error for invalid previousBlockID', () => {
					const invalidBlock = { ...block };
					(invalidBlock.header as any).previousBlockID = utils.getRandomBytes(64);

					expect(() => consensus['_verifyPreviousBlockID'](block as any)).toThrow(
						`Invalid previousBlockID ${invalidBlock.header.previousBlockID.toString(
							'hex',
						)} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});
				it('should be success when previousBlockID is equal to lastBlock ID', async () => {
					const validBlock = await createValidDefaultBlock({
						header: { height: 2, previousBlockID: consensus['_chain'].lastBlock.header.id },
					});
					expect(consensus['_verifyPreviousBlockID'](validBlock as any)).toBeUndefined();
				});
			});

			describe('generatorAddress', () => {
				it('should throw error if [generatorAddress.length !== 20]', async () => {
					const invalidBlock = { ...block };
					(invalidBlock.header as any).generatorAddress = utils.getRandomBytes(64);
					await expect(
						consensus['_verifyGeneratorAddress'](stateStore, invalidBlock as any),
					).rejects.toThrow(
						`Invalid length of generatorAddress ${invalidBlock.header.generatorAddress.toString(
							'hex',
						)} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});

				it('should throw error if generatorAddress has wrong block slot', async () => {
					jest.spyOn(consensus['_bft'].method, 'getGeneratorAtTimestamp');
					when(consensus['_bft'].method.getGeneratorAtTimestamp as never)
						.calledWith(stateStore, block.header.height, (block.header as any).timestamp)
						.mockResolvedValue({ address: utils.getRandomBytes(20) } as never);

					await expect(
						consensus['_verifyGeneratorAddress'](stateStore, block as any),
					).rejects.toThrow(
						`Generator with address ${block.header.generatorAddress.toString(
							'hex',
						)} of the block with id: ${block.header.id.toString(
							'hex',
						)} is ineligible to generate block for the current slot`,
					);
				});

				it('should be success if generatorAddress is valid and has right block slot', async () => {
					jest.spyOn(consensus['_bft'].method, 'getGeneratorAtTimestamp');
					when(consensus['_bft'].method.getGeneratorAtTimestamp as never)
						.calledWith(stateStore, block.header.height, block.header.timestamp)
						.mockResolvedValue({ address: block.header.generatorAddress } as never);

					await expect(
						consensus['_verifyGeneratorAddress'](stateStore, block as any),
					).resolves.toBeUndefined();
				});
			});

			describe('bftProperties', () => {
				it('should throw error for invalid maxHeightPrevoted', async () => {
					when(consensus['_bft'].method.getBFTHeights as never)
						.calledWith(stateStore)
						.mockResolvedValue({ maxHeightPrevoted: block.header.maxHeightPrevoted + 1 } as never);

					await expect(consensus['_verifyBFTProperties'](stateStore, block as any)).rejects.toThrow(
						`Invalid maxHeightPrevoted ${
							block.header.maxHeightPrevoted
						} of the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should throw error if the header is contradicting', async () => {
					when(consensus['_bft'].method.getBFTHeights as never)
						.calledWith(stateStore)
						.mockResolvedValue({ maxHeightPrevoted: block.header.maxHeightPrevoted } as never);

					when(consensus['_bft'].method.isHeaderContradictingChain as never)
						.calledWith(stateStore, block.header)
						.mockResolvedValue(true as never);

					await expect(consensus['_verifyBFTProperties'](stateStore, block as any)).rejects.toThrow(
						`Contradicting headers for the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success if maxHeightPrevoted is valid and header is not contradicting', async () => {
					when(consensus['_bft'].method.getBFTHeights as never)
						.calledWith(stateStore)
						.mockResolvedValue({ maxHeightPrevoted: block.header.maxHeightPrevoted } as never);

					when(consensus['_bft'].method.isHeaderContradictingChain as never)
						.calledWith(stateStore, block.header)
						.mockResolvedValue(false as never);

					await expect(
						consensus['_verifyBFTProperties'](stateStore, block as any),
					).resolves.toBeUndefined();
				});
			});

			describe('signature', () => {
				it('should throw error for invalid signature', async () => {
					const generatorKey = utils.getRandomBytes(32);

					when(consensus['_bft'].method.getBFTParameters as never)
						.calledWith(stateStore, block.header.height)
						.mockResolvedValue({
							validators: [{ address: block.header.generatorAddress, generatorKey }],
						} as never);

					await expect(
						consensus['_verifyBlockSignature'](stateStore, block as any),
					).rejects.toThrow(
						`Invalid signature ${block.header.signature.toString(
							'hex',
						)} of the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success when valid signature', async () => {
					const passphrase = Mnemonic.generateMnemonic();
					const keyPair = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);

					const blockHeader = createFakeBlockHeader();
					(blockHeader as any).generatorAddress = cryptoAddress.getAddressFromPublicKey(
						keyPair.publicKey,
					);
					(consensus['_chain'] as any).chainID = defaultChainID;

					blockHeader.sign(consensus['_chain'].chainID, keyPair.privateKey);
					const validBlock = new Block(blockHeader, [], new BlockAssets());

					when(consensus['_bft'].method.getBFTParameters as never)
						.calledWith(stateStore, validBlock.header.height)
						.mockResolvedValue({
							validators: [
								{ address: validBlock.header.generatorAddress, generatorKey: keyPair.publicKey },
							],
						} as never);

					await expect(
						consensus['_verifyBlockSignature'](stateStore, validBlock as any),
					).resolves.toBeUndefined();
				});
			});

			describe('validatorsHash', () => {
				it('should throw error when validatorsHash is undefined', async () => {
					when(consensus['_bft'].method.getBFTParameters as never)
						.calledWith(stateStore, block.header.height + 1)
						.mockResolvedValue({
							validatorsHash: utils.hash(utils.getRandomBytes(32)),
						} as never);

					block.header.validatorsHash = undefined;
					block.header['_signature'] = utils.getRandomBytes(64);
					block.header['_id'] = utils.getRandomBytes(64);

					await expect(
						consensus['_verifyValidatorsHash'](stateStore, block as any),
					).rejects.toThrow(
						`Validators hash is "undefined" for the block with id: ${block.header.id.toString(
							'hex',
						)}`,
					);
				});

				it('should throw error for invalid validatorsHash', async () => {
					when(consensus['_bft'].method.getBFTParameters as never)
						.calledWith(stateStore, block.header.height + 1)
						.mockResolvedValue({
							validatorsHash: utils.hash(utils.getRandomBytes(32)),
						} as never);

					await expect(
						consensus['_verifyValidatorsHash'](stateStore, block as any),
					).rejects.toThrow(
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Invalid validatorsHash ${block.header.validatorsHash?.toString(
							'hex',
						)} of the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success for valid validatorsHash', async () => {
					when(consensus['_bft'].method.getBFTParameters as never)
						.calledWith(stateStore, block.header.height + 1)
						.mockResolvedValue({ validatorsHash: block.header.validatorsHash } as never);

					await expect(
						consensus['_verifyValidatorsHash'](stateStore, block as any),
					).resolves.toBeUndefined();
				});
			});

			describe('aggregateCommit', () => {
				it('should throw error when aggregateCommit is undefined', async () => {
					Object.defineProperty(block.header, `aggregateCommit`, { value: undefined });

					await expect(
						consensus['_verifyAggregateCommit'](stateStore, block as any),
					).rejects.toThrow(
						`Aggregate Commit is "undefined" for the block with id: ${block.header.id.toString(
							'hex',
						)}`,
					);
				});

				it('should throw error for invalid aggregateCommit', async () => {
					when(consensus['_commitPool'].verifyAggregateCommit as never)
						.calledWith(stateStore, block.header.aggregateCommit)
						.mockResolvedValue(false as never);

					await expect(
						consensus['_verifyAggregateCommit'](stateStore, block as any),
					).rejects.toThrow(
						`Invalid aggregateCommit for the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success for valid aggregateCommit', async () => {
					when(consensus['_commitPool'].verifyAggregateCommit as never)
						.calledWith(stateStore, block.header.aggregateCommit)
						.mockResolvedValue(true as never);

					await expect(
						consensus['_verifyAggregateCommit'](stateStore, block as any),
					).resolves.toBeUndefined();
				});
			});
		});

		describe('_verifyEventRoot', () => {
			it('should throw error when eventRoot is not equal to calculated event root', async () => {
				await expect(
					consensus['_verifyEventRoot'](block as any, [
						new Event({
							data: utils.getRandomBytes(20),
							index: 0,
							module: 'token',
							topics: [Buffer.from([0])],
							name: 'Token Event Name',
							height: 12,
						}),
					]),
				).rejects.toThrow(
					`Event root is not valid for the block with id: ${block.header.id.toString('hex')}`,
				);
			});

			it('should be success when eventRoot is equal to blocks eventRoot', async () => {
				block.header.eventRoot = utils.hash(Buffer.alloc(0));
				await expect(consensus['_verifyEventRoot'](block as any, [])).resolves.toBeUndefined();
			});
		});
	});

	describe('when a block is invalid', () => {
		const invalidBlockID = Buffer.from('invalid');
		let invalidBlock: Block;

		beforeEach(async () => {
			await initConsensus();
			invalidBlock = await createValidDefaultBlock({
				header: {
					height: 2,
					previousBlockID: invalidBlockID,
					timestamp: consensus['_chain'].lastBlock.header.timestamp + 10,
				},
			});
		});

		it('should throw ApplyPenaltyError from _executeValidated()', async () => {
			const errorMessage = `Error: Invalid previousBlockID ${invalidBlockID.toString(
				'hex',
			)} of the block with id: ${invalidBlock.header.id.toString('hex')}`;

			await expect(consensus['_executeValidated'](invalidBlock)).rejects.toThrow(
				new ApplyPenaltyError(errorMessage),
			);
		});

		it('should throw ApplyPenaltyError from _execute() when fork status is VALID_BLOCK or TIE_BREAK', async () => {
			jest.spyOn(chain, 'validateBlock').mockImplementation(() => {
				throw new Error();
			});

			const peerID = 'peer';

			jest.spyOn(forkchoice, 'forkChoice').mockReturnValue(forkchoice.ForkStatus.VALID_BLOCK);
			await expect(consensus['_execute'](invalidBlock, peerID)).rejects.toThrow(ApplyPenaltyError);

			jest.spyOn(forkchoice, 'forkChoice').mockReturnValue(forkchoice.ForkStatus.TIE_BREAK);
			await expect(consensus['_execute'](invalidBlock, peerID)).rejects.toThrow(ApplyPenaltyError);
		});
	});
});
