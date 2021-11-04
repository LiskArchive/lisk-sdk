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

import { Block, BlockAssets, Chain } from '@liskhq/lisk-chain';
import { KVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { ApplyPenaltyError } from '../../../../src/errors';
import {
	CONSENSUS_EVENT_BLOCK_BROADCAST,
	CONSENSUS_EVENT_BLOCK_NEW,
	BFTAPI,
	ValidatorAPI,
} from '../../../../src/node/consensus';
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

describe('consensus', () => {
	const genesis = (genesisBlock() as unknown) as Block;

	let consensus: Consensus;
	let chain: Chain;
	let network: Network;
	let stateMachine: StateMachine;
	let bftAPI: BFTAPI;
	let validatorAPI: ValidatorAPI;

	beforeEach(async () => {
		const lastBlock = await createValidDefaultBlock({ header: { height: 1 } });
		chain = ({
			genesisBlockExist: jest.fn().mockResolvedValue(true),
			validateGenesisBlock: jest.fn(),
			newStateStore: jest.fn().mockResolvedValue({}),
			applyGenesisBlock: jest.fn(),
			saveBlock: jest.fn(),
			init: jest.fn(),
			finalizedHeight: 0,
			loadLastBlocks: jest.fn(),
			lastBlock,
			verifyBlock: jest.fn(),
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
			verifyBlock: jest.fn(),
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
	});

	describe('init', () => {
		it('should instantiate synchronizer', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
			await consensus.init({
				logger: loggerMock,
				db: {} as KVStore,
				genesisBlock: genesis,
			});
			expect(consensus['_synchronizer']).toBeInstanceOf(Synchronizer);
		});

		it('should instantiate endpoint', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
			await consensus.init({
				logger: loggerMock,
				db: {} as KVStore,
				genesisBlock: genesis,
			});
			expect(consensus['_endpoint']).toBeInstanceOf(NetworkEndpoint);
		});

		it('should register endpoints', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
			await consensus.init({
				logger: loggerMock,
				db: {} as KVStore,
				genesisBlock: genesis,
			});
			expect(network.registerEndpoint).toHaveBeenCalledTimes(3);
		});

		it('should execute genesis block if genesis block does not exist', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(false);
			await consensus.init({
				logger: loggerMock,
				db: {} as KVStore,
				genesisBlock: genesis,
			});

			expect(chain.validateGenesisBlock).toHaveBeenCalledTimes(1);
			expect(chain.saveBlock).toHaveBeenCalledTimes(1);
			expect(stateMachine.executeGenesisBlock).toHaveBeenCalledTimes(1);
			expect(chain.loadLastBlocks).toHaveBeenCalledTimes(1);
		});

		it('should not execute genesis block if it exists in chain', async () => {
			(chain.genesisBlockExist as jest.Mock).mockResolvedValue(true);
			await consensus.init({
				logger: loggerMock,
				db: {} as KVStore,
				genesisBlock: genesis,
			});
			expect(chain.saveBlock).not.toHaveBeenCalled();
			expect(stateMachine.executeGenesisBlock).not.toHaveBeenCalled();
			expect(chain.loadLastBlocks).toHaveBeenCalledTimes(1);
		});
	});

	describe('onBlockReceive', () => {
		const peerID = 'peer-id';
		beforeEach(async () => {
			await consensus.init({
				logger: loggerMock,
				db: {} as KVStore,
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
					jest.spyOn(consensus, '_verify' as any).mockResolvedValue(true);
					jest.spyOn(consensus, '_executeValidated' as any).mockResolvedValue(undefined);
					jest.spyOn(consensus, 'finalizedHeight').mockReturnValue(0);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should publish fork event', () => {
					expect(consensus.events.emit).toHaveBeenCalledTimes(2);
				});

				it('should validate block', () => {
					expect(consensus['_verify']).toHaveBeenCalledWith(block);
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
					jest.spyOn(consensus, '_verify' as any).mockResolvedValue(true);
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
					expect(consensus['_verify']).toHaveBeenCalledWith(block);
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
					jest.spyOn(consensus, '_verify' as any).mockResolvedValue(true);
					jest.spyOn(consensus, '_executeValidated' as any);
					jest.spyOn(consensus['_synchronizer'], 'run').mockResolvedValue(undefined);
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
					jest.spyOn(consensus, '_verify' as any);
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
					jest.spyOn(consensus, '_verify' as any);
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
					jest.spyOn(consensus, '_verify' as any);
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
					jest.spyOn(consensus, '_verify' as any);
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
					jest.spyOn(consensus, '_verify' as any).mockResolvedValue(true);
					jest.spyOn(consensus, '_executeValidated' as any).mockResolvedValue(undefined);
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

			describe('when the fork step returns ForkStatus.VALID_BLOCK', () => {
				beforeEach(async () => {
					jest.spyOn(forkchoice, 'forkChoice').mockReturnValue(forkchoice.ForkStatus.VALID_BLOCK);
					jest.spyOn(consensus.events, 'emit');
					jest.spyOn(consensus, '_verify' as any).mockResolvedValue(true);
					jest.spyOn(consensus, '_executeValidated' as any).mockResolvedValue(undefined);
					await consensus.onBlockReceive(input, peerID);
				});

				it('should not validate block', () => {
					expect(consensus['_verify']).toHaveBeenCalledTimes(1);
				});

				it('should not execute block', () => {
					expect(consensus['_executeValidated']).toHaveBeenCalledWith(block);
					expect(consensus['_executeValidated']).toHaveBeenCalledTimes(1);
				});
			});
		});
	});

	describe('execute', () => {
		let block: Block;
		let apiContext: APIContext;

		beforeEach(async () => {
			block = await createValidDefaultBlock({ header: { height: 2 } });
			apiContext = createTransientAPIContext({});
			jest.spyOn(chain, 'saveBlock').mockResolvedValue();
			jest.spyOn(consensus, 'finalizedHeight').mockReturnValue(0);

			jest.spyOn(stateMachine, 'verifyBlock').mockResolvedValue();
			jest.spyOn(stateMachine, 'executeBlock').mockResolvedValue();
			jest.spyOn(consensus.events, 'emit');

			await consensus.execute(block);
		});

		describe('block verification', () => {
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
					(invalidBlock.header as any).previousBlockID = cryptography.getRandomBytes(64);

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
				it('should throw error if [generatorAddress.lenght !== 20]', async () => {
					const invalidBlock = { ...block };
					(invalidBlock.header as any).generatorAddress = cryptography.getRandomBytes(64);
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
						.mockResolvedValue(cryptography.getRandomBytes(20) as never);

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
					const generatorKey = cryptography.getRandomBytes(32);

					when(consensus['_validatorAPI'].getValidatorAccount as never)
						.calledWith(apiContext, block.header.generatorAddress)
						.mockResolvedValue({ generatorKey } as never);

					await expect(
						consensus['_verifyBlockSignature'](apiContext, block as any),
					).rejects.toThrow(
						`Invalid signature ${block.header.signature.toString(
							'hex',
						)} of the block with id: ${block.header.id.toString('hex')}`,
					);
				});

				it('should be success when valid signature', async () => {
					const passphrase = Mnemonic.generateMnemonic();
					const keyPair = cryptography.getPrivateAndPublicKeyFromPassphrase(passphrase);

					const blockHeader = createFakeBlockHeader();
					(blockHeader as any).generatorAddress = cryptography.getAddressFromPublicKey(
						keyPair.publicKey,
					);
					(consensus['_chain'] as any).networkIdentifier = defaultNetworkIdentifier;

					blockHeader.sign(consensus['_chain'].networkIdentifier, keyPair.privateKey);
					const validBlock = new Block(blockHeader, [], new BlockAssets());

					when(consensus['_validatorAPI'].getValidatorAccount as never)
						.calledWith(apiContext, validBlock.header.generatorAddress)
						.mockResolvedValue({ generatorKey: keyPair.publicKey } as never);

					await expect(
						consensus['_verifyBlockSignature'](apiContext, validBlock as any),
					).resolves.toBeUndefined();
				});
			});

			describe('validatorsHash', () => {
				it('should throw error when validatorsHash is undefined', async () => {
					when(consensus['_bftAPI'].getBFTParameters as never)
						.calledWith(apiContext, block.header.height + 1)
						.mockResolvedValue({
							validatorsHash: cryptography.hash(cryptography.getRandomBytes(32)),
						} as never);

					block.header.validatorsHash = undefined;
					block.header['_signature'] = cryptography.getRandomBytes(64);
					block.header['_id'] = cryptography.getRandomBytes(64);

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
							validatorsHash: cryptography.hash(cryptography.getRandomBytes(32)),
						} as never);

					await expect(
						consensus['_verifyValidatorsHash'](apiContext, block as any),
					).rejects.toThrow(
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

			describe('validateBlockAsset', () => {
				it('should throw error if a module is not registered', async () => {
					const assetList = [
						{
							moduleID: 1,
							data: cryptography.getRandomBytes(64),
						},
						{
							moduleID: 2,
							data: cryptography.getRandomBytes(64),
						},
						{
							moduleID: 3,
							data: cryptography.getRandomBytes(64),
						},
						{
							moduleID: 4,
							data: cryptography.getRandomBytes(64),
						},
					];

					const invalidBlock = await createValidDefaultBlock({
						assets: new BlockAssets(assetList),
					});
					jest.spyOn(stateMachine, 'getAllModuleIDs').mockReturnValue([1, 2, 3]);

					expect(() => consensus['_validateBlockAsset'](invalidBlock as any)).toThrow(
						'Module with ID: 4 is not registered.',
					);
				});

				it('should be success if a module is registered', async () => {
					const assetList = [
						{
							moduleID: 1,
							data: cryptography.getRandomBytes(64),
						},
						{
							moduleID: 2,
							data: cryptography.getRandomBytes(64),
						},
						{
							moduleID: 3,
							data: cryptography.getRandomBytes(64),
						},
						{
							moduleID: 4,
							data: cryptography.getRandomBytes(64),
						},
					];

					const invalidBlock = await createValidDefaultBlock({
						assets: new BlockAssets(assetList),
					});
					jest.spyOn(stateMachine, 'getAllModuleIDs').mockReturnValue([1, 2, 3, 4]);

					expect(consensus['_validateBlockAsset'](invalidBlock as any)).toBeUndefined();
				});
			});
		});

		it('should verify block using state machine', () => {
			expect(stateMachine.verifyBlock).toHaveBeenCalledTimes(1);
		});

		it('should call broadcast to the network', () => {
			expect(network.send).toHaveBeenCalledTimes(1);
			expect(consensus.events.emit).toHaveReturnedTimes(2);
			expect(consensus.events.emit).toHaveBeenCalledWith(
				CONSENSUS_EVENT_BLOCK_BROADCAST,
				expect.anything(),
			);
			expect(consensus.events.emit).toHaveBeenCalledWith(
				CONSENSUS_EVENT_BLOCK_NEW,
				expect.anything(),
			);
		});

		it('should execute block using state machine', () => {
			expect(stateMachine.executeBlock).toHaveBeenCalledTimes(1);
		});

		it('should save block', () => {
			expect(chain.saveBlock).toHaveBeenCalledWith(block, expect.anything(), 0, {
				removeFromTempTable: false,
			});
		});
	});
});
