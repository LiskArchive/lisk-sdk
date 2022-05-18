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

import {
	Block,
	BlockAssets,
	Chain,
	CurrentState,
	SMTStore,
	StateStore,
	Event,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { when } from 'jest-when';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { SparseMerkleTree } from '@liskhq/lisk-tree';
import {
	generatePrivateKey,
	getAddressFromPassphrase,
	getAddressFromPublicKey,
	getPrivateAndPublicKeyFromPassphrase,
	getPublicKeyFromPrivateKey,
	getRandomBytes,
	hash,
} from '@liskhq/lisk-cryptography';
import { ApplyPenaltyError } from '../../../../src/errors';
import { BFTAPI, ValidatorAPI } from '../../../../src/node/consensus';
import { Consensus } from '../../../../src/node/consensus/consensus';
import { NetworkEndpoint } from '../../../../src/node/consensus/network_endpoint';
import { Synchronizer } from '../../../../src/node/consensus/synchronizer';
import {
	ApplyPenaltyAndRestartError,
	RestartError,
	AbortError,
} from '../../../../src/node/consensus/synchronizer/errors';
import { Network } from '../../../../src/node/network';
import { StateMachine } from '../../../../src/node/state_machine/state_machine';
import { loggerMock } from '../../../../src/testing/mocks';
import {
	createFakeBlockHeader,
	createValidDefaultBlock,
	defaultNetworkIdentifier,
	genesisBlock,
} from '../../../fixtures';
import * as forkchoice from '../../../../src/node/consensus/fork_choice/fork_choice_rule';
import { postBlockEventSchema } from '../../../../src/node/consensus/schema';
import { APIContext } from '../../../../src/node/state_machine';
import { createTransientAPIContext } from '../../../../src/testing';
import { fakeLogger } from '../../../utils/node';

describe('consensus', () => {
	const genesis = (genesisBlock() as unknown) as Block;
	let consensus: Consensus;
	let chain: Chain;
	let network: Network;
	let stateMachine: StateMachine;
	let bftAPI: BFTAPI;
	let validatorAPI: ValidatorAPI;

	let dbMock: any;

	beforeEach(async () => {
		const lastBlock = await createValidDefaultBlock({ header: { height: 1 } });
		chain = ({
			genesisBlockExist: jest.fn().mockResolvedValue(true),
			newStateStore: jest.fn().mockResolvedValue({}),
			applyGenesisBlock: jest.fn(),
			saveBlock: jest.fn(),
			init: jest.fn(),
			finalizedHeight: 0,
			loadLastBlocks: jest.fn(),
			lastBlock,
			networkIdentifier: Buffer.from('network-identifier'),
			validateBlock: jest.fn(),
			validateTransaction: jest.fn(),
			removeBlock: jest.fn(),
		} as unknown) as Chain;
		network = ({
			registerEndpoint: jest.fn(),
			registerHandler: jest.fn(),
			applyPenaltyOnPeer: jest.fn(),
			send: jest.fn(),
			applyNodeInfo: jest.fn(),
		} as unknown) as Network;
		stateMachine = ({
			executeGenesisBlock: jest.fn(),
			verifyAssets: jest.fn(),
			executeBlock: jest.fn(),
			getAllModuleIDs: jest.fn(),
		} as unknown) as StateMachine;
		bftAPI = {
			getBFTHeights: jest
				.fn()
				.mockResolvedValue({ maxHeghgtPrevoted: 0, maxHeightPrecommitted: 0 }),
			isHeaderContradictingChain: jest.fn(),
			getBFTParameters: jest.fn(),
		} as never;
		validatorAPI = {
			getGeneratorAtTimestamp: jest.fn(),
			getValidatorAccount: jest.fn(),
			getSlotNumber: jest.fn(),
		} as never;
		consensus = new Consensus({
			chain,
			network,
			stateMachine,
			bftAPI,
			validatorAPI,
			genesisConfig: {} as any,
		});
		dbMock = {
			get: jest.fn(),
			put: jest.fn(),
			batch: jest.fn(),
		};
		genesis.validateGenesis = jest.fn();
	});

	describe('init', () => {
		it('should instantiate synchronizer', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
			await consensus.init({
				logger: loggerMock,
				db: dbMock,
				genesisBlock: genesis,
			});
			expect(consensus['_synchronizer']).toBeInstanceOf(Synchronizer);
		});

		it('should instantiate endpoint', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
			await consensus.init({
				logger: loggerMock,
				db: dbMock,
				genesisBlock: genesis,
			});
			expect(consensus['_endpoint']).toBeInstanceOf(NetworkEndpoint);
		});

		it('should register endpoints', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
			await consensus.init({
				logger: loggerMock,
				db: dbMock,
				genesisBlock: genesis,
			});
			expect(network.registerEndpoint).toHaveBeenCalledTimes(3);
		});

		it('should execute genesis block if genesis block does not exist', async () => {
			// Arrange
			jest.spyOn(consensus as any, '_prepareFinalizingState').mockReturnValue({
				smt: { rootHash: genesis.header.stateRoot },
			});
			jest.spyOn(consensus['_bftAPI'] as any, 'getBFTParameters').mockResolvedValue({
				validatorsHash: genesis.header.validatorsHash,
			});
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(false);
			await consensus.init({
				logger: loggerMock,
				db: dbMock,
				genesisBlock: genesis,
			});

			expect(genesis.validateGenesis).toHaveBeenCalledTimes(1);
			expect(chain.saveBlock).toHaveBeenCalledTimes(1);
			expect(stateMachine.executeGenesisBlock).toHaveBeenCalledTimes(1);
			expect(chain.loadLastBlocks).toHaveBeenCalledTimes(1);
		});

		it('should not execute genesis block if it exists in chain', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
			await consensus.init({
				logger: loggerMock,
				db: dbMock,
				genesisBlock: genesis,
			});
			expect(chain.saveBlock).not.toHaveBeenCalled();
			expect(stateMachine.executeGenesisBlock).not.toHaveBeenCalled();
			expect(chain.loadLastBlocks).toHaveBeenCalledTimes(1);
		});

		it('should fail initialization if stateRoot is invalid', async () => {
			// Arrange
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(false);
			jest.spyOn(consensus as any, '_prepareFinalizingState').mockReturnValue({
				smt: { rootHash: getRandomBytes(32) },
			});
			jest.spyOn(consensus['_bftAPI'] as any, 'getBFTParameters').mockResolvedValue({
				validatorsHash: genesis.header.validatorsHash,
			});
			await expect(
				consensus.init({
					logger: loggerMock,
					db: dbMock,
					genesisBlock: genesis,
				}),
			).rejects.toThrow('Genesis block state root is invalid');
		});

		it('should fail initialization if eventRoot is invalid', async () => {
			// Arrange
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(false);
			jest.spyOn(consensus['_bftAPI'] as any, 'getBFTParameters').mockResolvedValue({
				validatorsHash: genesis.header.validatorsHash,
			});
			jest
				.spyOn(consensus, '_verifyEventRoot' as never)
				.mockRejectedValue(new Error('Event root is not valid for the block') as never);

			await expect(
				consensus.init({
					logger: loggerMock,
					db: dbMock,
					genesisBlock: genesis,
				}),
			).rejects.toThrow('Event root is not valid for the block');
		});

		it('should fail initialization if validatorsHash is invalid', async () => {
			// Arrange
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(false);
			jest.spyOn(consensus as any, '_prepareFinalizingState').mockReturnValue({
				smt: { rootHash: genesis.header.stateRoot },
			});
			jest.spyOn(consensus['_bftAPI'] as any, 'getBFTParameters').mockResolvedValue({
				validatorsHash: getRandomBytes(32),
			});
			await expect(
				consensus.init({
					logger: loggerMock,
					db: dbMock,
					genesisBlock: genesis,
				}),
			).rejects.toThrow('Genesis block validators hash is invalid');
		});
	});

	describe('certifySingleCommit', () => {
		const passphrase = Mnemonic.generateMnemonic(256);
		const address = getAddressFromPassphrase(passphrase);
		const blsSK = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
		const blsPK = getPublicKeyFromPrivateKey(blsSK);
		const blockHeader = createFakeBlockHeader({ height: 303 });

		beforeEach(async () => {
			await consensus.init({
				logger: loggerMock,
				db: dbMock,
				genesisBlock: genesis,
			});

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
			await consensus.init({
				logger: loggerMock,
				db: dbMock,
				genesisBlock: genesis,
			});
		});

		it('should not execute when syncing', async () => {
			jest.spyOn(consensus, 'syncing').mockReturnValue(true);
			await consensus.onBlockReceive(Buffer.alloc(0), peerID);
			expect(network.applyPenaltyOnPeer).not.toHaveBeenCalled();
		});

		it('should apply when data is not Buffer', async () => {
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
					expect(consensus.events.emit).toHaveBeenCalledTimes(1);
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
					expect(consensus.events.emit).toHaveBeenCalledTimes(2);
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
					expect(consensus.events.emit).toHaveBeenCalledTimes(2);
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
					expect(consensus.events.emit).toHaveBeenCalledTimes(1);
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
					expect(consensus.events.emit).toHaveBeenCalledTimes(1);
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
		let block: Block;
		let apiContext: APIContext;

		describe('block verification', () => {
			beforeEach(async () => {
				block = await createValidDefaultBlock({
					header: { height: 2, previousBlockID: chain.lastBlock.header.id },
				});
				apiContext = createTransientAPIContext({});
				jest.spyOn(chain, 'saveBlock').mockResolvedValue();
				jest.spyOn(consensus, 'finalizedHeight').mockReturnValue(0);
				jest.spyOn(stateMachine, 'verifyAssets').mockResolvedValue();
				jest.spyOn(stateMachine, 'executeBlock').mockResolvedValue();
				jest.spyOn(bftAPI, 'getBFTParameters').mockResolvedValue({
					validatorsHash: block.header.validatorsHash,
				} as never);
				jest.spyOn(consensus.events, 'emit');
				consensus['_db'] = dbMock;
				consensus['_verifyStateRoot'] = jest.fn().mockReturnValue(undefined);
				consensus['_verifyEventRoot'] = jest.fn().mockReturnValue(undefined);

				await consensus.init({
					db: dbMock,
					genesisBlock: genesis,
					logger: fakeLogger,
				});
				jest.spyOn(consensus['_commitPool'], 'verifyAggregateCommit');
			});

			describe('timestamp', () => {
				it('should throw error when block timestamp is from future', async () => {
					const invalidBlock = { ...block };
					const now = Date.now();

					Date.now = jest.fn(() => now);

					(invalidBlock.header as any).timestamp = Math.floor((Date.now() + 10000) / 1000);
					when(consensus['_validatorAPI'].getSlotNumber as any)
						.calledWith(apiContext, (invalidBlock.header as any).timestamp)
						.mockResolvedValue(10 as never)
						.calledWith(apiContext, Math.floor(now / 1000))
						.mockResolvedValue(5 as never);

					await expect(
						consensus['_verifyTimestamp'](apiContext, invalidBlock as any),
					).rejects.toThrow(
						`Invalid timestamp ${
							invalidBlock.header.timestamp
						} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});

				it('should throw error when block slot is less than previous block slot', async () => {
					const invalidBlock = { ...block };
					const now = Date.now();

					Date.now = jest.fn(() => now);

					(invalidBlock.header as any).timestamp = Math.floor(Date.now() / 1000);
					when(consensus['_validatorAPI'].getSlotNumber as any)
						.calledWith(apiContext, (invalidBlock.header as any).timestamp)
						.mockResolvedValue(10 as never)
						.calledWith(apiContext, Math.floor(now / 1000))
						.mockResolvedValue(10 as never);

					(consensus['_chain'].lastBlock.header as any).timestamp = Math.floor(Date.now() / 1000);

					await expect(
						consensus['_verifyTimestamp'](apiContext, invalidBlock as any),
					).rejects.toThrow(
						`Invalid timestamp ${
							invalidBlock.header.timestamp
						} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});

				it('should be success when valid block timestamp', async () => {
					const now = Date.now();

					Date.now = jest.fn(() => now);

					(block.header as any).timestamp = Math.floor(Date.now() / 1000);
					when(consensus['_validatorAPI'].getSlotNumber as any)
						.calledWith(apiContext, (block.header as any).timestamp)
						.mockResolvedValue(10 as never)
						.calledWith(apiContext, Math.floor(now / 1000))
						.mockResolvedValue(10 as never);

					await expect(
						consensus['_verifyTimestamp'](apiContext, block as any),
					).resolves.toBeUndefined();
				});
			});

			describe('height', () => {
				it('should throw error when block height is equal to last block height', () => {
					const invalidBlock = { ...block };
					(invalidBlock.header as any).height = consensus['_chain'].lastBlock.header.height;

					expect(() => consensus['_verifyAssetsHeight'](invalidBlock as any)).toThrow(
						`Invalid height ${
							invalidBlock.header.height
						} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});
				it('should be success when block has [height===lastBlock.height+1]', () => {
					expect(consensus['_verifyAssetsHeight'](block as any)).toBeUndefined();
				});
			});

			describe('previousBlockID', () => {
				it('should throw error for invalid previousBlockID', () => {
					const invalidBlock = { ...block };
					(invalidBlock.header as any).previousBlockID = getRandomBytes(64);

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
					(invalidBlock.header as any).generatorAddress = getRandomBytes(64);
					await expect(
						consensus['_verifyGeneratorAddress'](apiContext, invalidBlock as any),
					).rejects.toThrow(
						`Invalid length of generatorAddress ${invalidBlock.header.generatorAddress.toString(
							'hex',
						)} of the block with id: ${invalidBlock.header.id.toString('hex')}`,
					);
				});

				it('should throw error if generatorAddress has wrong block slot', async () => {
					when(consensus['_validatorAPI'].getGeneratorAtTimestamp as never)
						.calledWith(apiContext, (block.header as any).timestamp)
						.mockResolvedValue(getRandomBytes(20) as never);

					await expect(
						consensus['_verifyGeneratorAddress'](apiContext, block as any),
					).rejects.toThrow(
						`Generator with address ${block.header.generatorAddress.toString(
							'hex',
						)} of the block with id: ${block.header.id.toString(
							'hex',
						)} is ineligible to generate block for the current slot`,
					);
				});

				it('should be success if generatorAddress is valid and has right block slot', async () => {
					when(consensus['_validatorAPI'].getGeneratorAtTimestamp as never)
						.calledWith(apiContext, (block.header as any).timestamp)
						.mockResolvedValue(block.header.generatorAddress as never);

					await expect(
						consensus['_verifyGeneratorAddress'](apiContext, block as any),
					).resolves.toBeUndefined();
				});
			});

			describe('bftProperties', () => {
				it('should throw error for invalid maxHeightPrevoted', async () => {
					when(consensus['_bftAPI'].getBFTHeights as never)
						.calledWith(apiContext)
						.mockResolvedValue({ maxHeightPrevoted: block.header.maxHeightPrevoted + 1 } as never);

					await expect(consensus['_verifyBFTProperties'](apiContext, block as any)).rejects.toThrow(
						`Invalid maxHeightPrevoted ${
							block.header.maxHeightPrevoted
						} of the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should throw error if the header is contradicting', async () => {
					when(consensus['_bftAPI'].getBFTHeights as never)
						.calledWith(apiContext)
						.mockResolvedValue({ maxHeightPrevoted: block.header.maxHeightPrevoted } as never);

					when(consensus['_bftAPI'].isHeaderContradictingChain as never)
						.calledWith(apiContext, block.header)
						.mockResolvedValue(true as never);

					await expect(consensus['_verifyBFTProperties'](apiContext, block as any)).rejects.toThrow(
						`Contradicting headers for the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success if maxHeightPrevoted is valid and header is not contradicting', async () => {
					when(consensus['_bftAPI'].getBFTHeights as never)
						.calledWith(apiContext)
						.mockResolvedValue({ maxHeightPrevoted: block.header.maxHeightPrevoted } as never);

					when(consensus['_bftAPI'].isHeaderContradictingChain as never)
						.calledWith(apiContext, block.header)
						.mockResolvedValue(false as never);

					await expect(
						consensus['_verifyBFTProperties'](apiContext, block as any),
					).resolves.toBeUndefined();
				});
			});

			describe('signature', () => {
				it('should throw error for invalid signature', async () => {
					const generatorKey = getRandomBytes(32);

					when(consensus['_validatorAPI'].getValidatorAccount as never)
						.calledWith(apiContext, block.header.generatorAddress)
						.mockResolvedValue({ generatorKey } as never);

					await expect(
						consensus['_verifyAssetsSignature'](apiContext, block as any),
					).rejects.toThrow(
						`Invalid signature ${block.header.signature.toString(
							'hex',
						)} of the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success when valid signature', async () => {
					const passphrase = Mnemonic.generateMnemonic();
					const keyPair = getPrivateAndPublicKeyFromPassphrase(passphrase);

					const blockHeader = createFakeBlockHeader();
					(blockHeader as any).generatorAddress = getAddressFromPublicKey(keyPair.publicKey);
					(consensus['_chain'] as any).networkIdentifier = defaultNetworkIdentifier;

					blockHeader.sign(consensus['_chain'].networkIdentifier, keyPair.privateKey);
					const validBlock = new Block(blockHeader, [], new BlockAssets());

					when(consensus['_validatorAPI'].getValidatorAccount as never)
						.calledWith(apiContext, validBlock.header.generatorAddress)
						.mockResolvedValue({ generatorKey: keyPair.publicKey } as never);

					await expect(
						consensus['_verifyAssetsSignature'](apiContext, validBlock as any),
					).resolves.toBeUndefined();
				});
			});

			describe('validatorsHash', () => {
				it('should throw error when validatorsHash is undefined', async () => {
					when(consensus['_bftAPI'].getBFTParameters as never)
						.calledWith(apiContext, block.header.height + 1)
						.mockResolvedValue({
							validatorsHash: hash(getRandomBytes(32)),
						} as never);

					block.header.validatorsHash = undefined;
					block.header['_signature'] = getRandomBytes(64);
					block.header['_id'] = getRandomBytes(64);

					await expect(
						consensus['_verifyValidatorsHash'](apiContext, block as any),
					).rejects.toThrow(
						`Validators hash is "undefined" for the block with id: ${block.header.id.toString(
							'hex',
						)}`,
					);
				});

				it('should throw error for invalid validatorsHash', async () => {
					when(consensus['_bftAPI'].getBFTParameters as never)
						.calledWith(apiContext, block.header.height + 1)
						.mockResolvedValue({
							validatorsHash: hash(getRandomBytes(32)),
						} as never);

					await expect(
						consensus['_verifyValidatorsHash'](apiContext, block as any),
					).rejects.toThrow(
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Invalid validatorsHash ${block.header.validatorsHash?.toString(
							'hex',
						)} of the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success for valid validatorsHash', async () => {
					when(consensus['_bftAPI'].getBFTParameters as never)
						.calledWith(apiContext, block.header.height + 1)
						.mockResolvedValue({ validatorsHash: block.header.validatorsHash } as never);

					await expect(
						consensus['_verifyValidatorsHash'](apiContext, block as any),
					).resolves.toBeUndefined();
				});
			});

			describe('aggregateCommit', () => {
				it('should throw error when aggregateCommit is undefined', async () => {
					Object.defineProperty(block.header, `aggregateCommit`, { value: undefined });

					await expect(
						consensus['_verifyAggregateCommit'](apiContext, block as any),
					).rejects.toThrow(
						`Aggregate Commit is "undefined" for the block with id: ${block.header.id.toString(
							'hex',
						)}`,
					);
				});

				it('should throw error for invalid aggregateCommit', async () => {
					when(consensus['_commitPool'].verifyAggregateCommit as never)
						.calledWith(apiContext, block.header.aggregateCommit)
						.mockResolvedValue(false as never);

					await expect(
						consensus['_verifyAggregateCommit'](apiContext, block as any),
					).rejects.toThrow(
						`Invalid aggregateCommit for the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success for valid aggregateCommit', async () => {
					when(consensus['_commitPool'].verifyAggregateCommit as never)
						.calledWith(apiContext, block.header.aggregateCommit)
						.mockResolvedValue(true as never);

					await expect(
						consensus['_verifyAggregateCommit'](apiContext, block as any),
					).resolves.toBeUndefined();
				});
			});
		});

		describe('_verifyStateRoot', () => {
			it('should throw error when stateRoot is not equal to calculated state root', () => {
				expect(() => consensus['_verifyStateRoot'](block as any, getRandomBytes(32))).toThrow(
					`State root is not valid for the block with id: ${block.header.id.toString('hex')}`,
				);
			});

			it('should be success when stateRoot is equal to blocks stateRoot', () => {
				expect(
					consensus['_verifyStateRoot'](block as any, block.header.stateRoot as Buffer),
				).toBeUndefined();
			});
		});

		describe('_verifyEventRoot', () => {
			it('should throw error when eventRoot is not equal to calculated event root', async () => {
				await expect(
					consensus['_verifyEventRoot'](block as any, [
						new Event({
							data: getRandomBytes(20),
							index: 0,
							moduleID: Buffer.from([0, 0, 0, 2]),
							topics: [Buffer.from([0])],
							typeID: Buffer.from([0, 0, 0, 1]),
						}),
					]),
				).rejects.toThrow(
					`Event root is not valid for the block with id: ${block.header.id.toString('hex')}`,
				);
			});

			it('should be success when eventRoot is equal to blocks eventRoot', async () => {
				block.header.eventRoot = hash(Buffer.alloc(0));
				await expect(consensus['_verifyEventRoot'](block as any, [])).resolves.toBeUndefined();
			});
		});

		describe('_prepareFinalizingState', () => {
			const sampleDiff = {
				created: [Buffer.from('key1', 'utf-8')],
				updated: [
					{
						key: Buffer.from('key2', 'utf-8'),
						value: Buffer.from('data2'),
					},
				],
				deleted: [
					{
						key: Buffer.from('key3', 'utf-8'),
						value: Buffer.from('data3'),
					},
				],
			};

			beforeEach(() => {
				(consensus as any)['_db'] = new InMemoryKVStore();
			});

			it('should return current state object with finalized stores', async () => {
				const batch = consensus['_db'].batch();
				const smtStore = new SMTStore(consensus['_db']);
				const smt = new SparseMerkleTree({
					db: smtStore,
					rootHash: consensus['_chain'].lastBlock.header.stateRoot,
				});
				const stateStore = new StateStore(new InMemoryKVStore());
				jest.spyOn(stateStore, 'finalize').mockResolvedValue(sampleDiff as never);

				const expectedCurrentState: CurrentState = {
					diff: sampleDiff,
					batch,
					smt,
					smtStore,
					stateStore,
				};

				await expect(
					consensus['_prepareFinalizingState'](
						stateStore,
						consensus['_chain'].lastBlock.header.stateRoot,
					),
				).resolves.toEqual(expectedCurrentState);
			});

			it('should return current state object without finalized stores when flag is false', async () => {
				const initDiff = { created: [], updated: [], deleted: [] };
				const batch = consensus['_db'].batch();
				const smtStore = new SMTStore(consensus['_db']);
				const smt = new SparseMerkleTree({
					db: smtStore,
					rootHash: consensus['_chain'].lastBlock.header.stateRoot,
				});
				const stateStore = new StateStore(consensus['_db']);
				jest.spyOn(stateStore, 'finalize').mockResolvedValue(sampleDiff as never);

				const expectedCurrentState: CurrentState = {
					diff: initDiff,
					batch,
					smt,
					smtStore,
					stateStore,
				};

				await expect(
					consensus['_prepareFinalizingState'](
						stateStore,
						consensus['_chain'].lastBlock.header.stateRoot,
						false,
					),
				).resolves.toEqual(expectedCurrentState);
			});
		});
	});
});
