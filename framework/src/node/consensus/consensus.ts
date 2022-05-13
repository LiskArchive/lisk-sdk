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
import { EventEmitter } from 'events';
import {
	Block,
	Chain,
	Event,
	Slots,
	SMTStore,
	StateStore,
	CurrentState,
	BlockHeader,
	MAX_EVENTS_PER_BLOCK,
	EVENT_KEY_LENGTH,
} from '@liskhq/lisk-chain';
import { jobHandlers, objects } from '@liskhq/lisk-utils';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { SparseMerkleTree } from '@liskhq/lisk-tree';
import { Logger } from '../../logger';
import { StateMachine } from '../state_machine/state_machine';
import { BlockContext } from '../state_machine/block_context';
import {
	BlockSynchronizationMechanism,
	FastChainSwitchingMechanism,
	Synchronizer,
} from './synchronizer';
import { ApplyPenaltyError } from '../../errors';
import { AbortError, ApplyPenaltyAndRestartError, RestartError } from './synchronizer/errors';
import { EventQueue } from '../state_machine/event_queue';
import { BlockExecutor } from './synchronizer/type';
import { GenesisBlockContext } from '../state_machine/genesis_block_context';
import { Network } from '../network';
import { NetworkEndpoint, EndpointArgs } from './network_endpoint';
import { EventPostBlockData, postBlockEventSchema } from './schema';
import {
	CONSENSUS_EVENT_BLOCK_BROADCAST,
	CONSENSUS_EVENT_BLOCK_DELETE,
	CONSENSUS_EVENT_BLOCK_NEW,
	CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED,
	CONSENSUS_EVENT_FORK_DETECTED,
	NETWORK_EVENT_POST_BLOCK,
	NETWORK_EVENT_POST_NODE_INFO,
	NETWORK_RPC_GET_BLOCKS_FROM_ID,
	NETWORK_RPC_GET_HIGHEST_COMMON_BLOCK,
	NETWORK_RPC_GET_LAST_BLOCK,
} from './constants';
import { GenesisConfig } from '../../types';
import { ValidatorAPI, BFTAPI, AggregateCommit } from './types';
import { APIContext, createAPIContext } from '../state_machine';
import { forkChoice, ForkStatus } from './fork_choice/fork_choice_rule';
import { createNewAPIContext } from '../state_machine/api_context';
import { CommitPool } from './certificate_generation/commit_pool';
import { ValidatorInfo } from './certificate_generation/types';

interface ConsensusArgs {
	stateMachine: StateMachine;
	chain: Chain;
	network: Network;
	genesisConfig: GenesisConfig;
	bftAPI: BFTAPI;
	validatorAPI: ValidatorAPI;
}

interface InitArgs {
	logger: Logger;
	genesisBlock: Block;
	db: KVStore;
}

interface ExecuteOptions {
	skipBroadcast?: boolean;
	removeFromTempTable?: boolean;
}
interface DeleteOptions {
	saveTempBlock?: boolean;
}

const BLOCK_VERSION = 2;
const forkStatusList = [
	ForkStatus.IDENTICAL_BLOCK,
	ForkStatus.VALID_BLOCK,
	ForkStatus.DOUBLE_FORGING,
	ForkStatus.TIE_BREAK,
	ForkStatus.DIFFERENT_CHAIN,
	ForkStatus.DISCARD,
];

export class Consensus {
	public readonly events: EventEmitter;

	private readonly _stateMachine: StateMachine;
	private readonly _chain: Chain;
	private readonly _network: Network;
	private readonly _mutex: jobHandlers.Mutex;
	private readonly _validatorAPI: ValidatorAPI;
	private readonly _bftAPI: BFTAPI;
	private readonly _genesisConfig: GenesisConfig;

	// init parameters
	private _logger!: Logger;
	private _db!: KVStore;
	private _commitPool!: CommitPool;
	private _endpoint!: NetworkEndpoint;
	private _synchronizer!: Synchronizer;
	private _genesisBlockTimestamp?: number;

	private _stop = false;

	public constructor(args: ConsensusArgs) {
		this.events = new EventEmitter();
		this._stateMachine = args.stateMachine;
		this._chain = args.chain;
		this._network = args.network;
		this._mutex = new jobHandlers.Mutex();
		this._validatorAPI = args.validatorAPI;
		this._bftAPI = args.bftAPI;
		this._genesisConfig = args.genesisConfig;
	}

	public async init(args: InitArgs): Promise<void> {
		this._logger = args.logger;
		this._db = args.db;
		this._commitPool = new CommitPool({
			db: this._db,
			blockTime: this._genesisConfig.blockTime,
			bftAPI: this._bftAPI,
			chain: this._chain,
			network: this._network,
			validatorsAPI: this._validatorAPI,
		});
		this._endpoint = new NetworkEndpoint({
			chain: this._chain,
			logger: this._logger,
			network: this._network,
			db: this._db,
		} as EndpointArgs); // TODO: Remove casting in issue where commitPool is added here
		const blockExecutor = this._createBlockExecutor();
		const blockSyncMechanism = new BlockSynchronizationMechanism({
			chain: this._chain,
			logger: this._logger,
			network: this._network,
			blockExecutor,
		});
		const fastChainSwitchMechanism = new FastChainSwitchingMechanism({
			chain: this._chain,
			logger: this._logger,
			network: this._network,
			blockExecutor,
		});
		this._synchronizer = new Synchronizer({
			chainModule: this._chain,
			logger: this._logger,
			blockExecutor,
			mechanisms: [blockSyncMechanism, fastChainSwitchMechanism],
		});

		this._network.registerEndpoint(NETWORK_RPC_GET_LAST_BLOCK, ({ peerId }) => {
			this._endpoint.handleRPCGetLastBlock(peerId);
		});
		this._network.registerEndpoint(NETWORK_RPC_GET_BLOCKS_FROM_ID, async ({ data, peerId }) =>
			this._endpoint.handleRPCGetBlocksFromId(data, peerId),
		);
		this._network.registerEndpoint(NETWORK_RPC_GET_HIGHEST_COMMON_BLOCK, async ({ data, peerId }) =>
			this._endpoint.handleRPCGetHighestCommonBlock(data, peerId),
		);
		this._network.registerHandler(NETWORK_EVENT_POST_BLOCK, ({ data, peerId }) => {
			this.onBlockReceive(data, peerId).catch(err => {
				this._logger.error({ err: err as Error, peerId }, 'Fail to handle received block');
			});
		});
		this._network.registerHandler(NETWORK_EVENT_POST_NODE_INFO, ({ data, peerId }) => {
			this._logger.debug({ peerId, data }, 'Received new node info');
		});

		this._logger.debug(
			{
				id: args.genesisBlock.header.id,
				transactionRoot: args.genesisBlock.header.transactionRoot,
			},
			'Initializing consensus component.',
		);
		const genesisExist = await this._chain.genesisBlockExist(args.genesisBlock);
		// do init check for block state. We need to load the blockchain
		const stateStore = new StateStore(this._db);
		if (!genesisExist) {
			args.genesisBlock.validateGenesis();
			const eventQueue = new EventQueue();
			const ctx = new GenesisBlockContext({
				eventQueue,
				header: args.genesisBlock.header,
				assets: args.genesisBlock.assets,
				logger: this._logger,
				stateStore: (stateStore as unknown) as StateStore,
			});
			await this._stateMachine.executeGenesisBlock(ctx);
			const state = await this._prepareFinalizingState(stateStore);
			if (
				!args.genesisBlock.header.stateRoot ||
				!state.smt.rootHash.equals(args.genesisBlock.header.stateRoot)
			) {
				throw new Error('Genesis block state root is invalid');
			}
			const apiContext = createAPIContext({ stateStore: state.stateStore, eventQueue });
			const bftParams = await this._bftAPI.getBFTParameters(
				apiContext,
				args.genesisBlock.header.height + 1,
			);

			if (
				!args.genesisBlock.header.validatorsHash ||
				!bftParams.validatorsHash.equals(args.genesisBlock.header.validatorsHash)
			) {
				throw new Error('Genesis block validators hash is invalid');
			}
			const events = ctx.eventQueue.getEvents();
			await this._verifyEventRoot(args.genesisBlock, events);

			await this._chain.saveBlock(
				args.genesisBlock,
				events,
				state,
				args.genesisBlock.header.height,
			);
		}
		await this._chain.loadLastBlocks(args.genesisBlock);
		this._genesisBlockTimestamp = args.genesisBlock.header.timestamp;
		this._logger.info('Consensus component ready.');
	}

	public syncing(): boolean {
		return this._synchronizer.isActive;
	}

	public finalizedHeight(): number {
		return this._chain.finalizedHeight;
	}

	public async onBlockReceive(data: unknown, peerId: string): Promise<void> {
		// Should ignore received block if syncing
		if (this.syncing()) {
			this._logger.debug("Client is syncing. Can't process new block at the moment.");
			return;
		}

		if (!Buffer.isBuffer(data)) {
			const errorMessage = 'Received invalid post block data';
			this._logger.warn(
				{
					peerId,
					error: '',
				},
				errorMessage,
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			return;
		}

		let decodedData: EventPostBlockData;
		try {
			decodedData = codec.decode<EventPostBlockData>(postBlockEventSchema, data);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					data,
				},
				'Received post block broadcast request in unexpected format',
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const { block: blockBytes } = decodedData;

		let block: Block;
		try {
			block = Block.fromBytes(blockBytes);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					data,
				},
				'Received post block broadcast request in not decodable format',
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		try {
			await this._execute(block, peerId);
		} catch (error) {
			if (error instanceof ApplyPenaltyError) {
				this._logger.warn(
					{
						err: error as Error,
						data,
					},
					'Received post block broadcast request with invalid block',
				);
				this._network.applyPenaltyOnPeer({
					peerId,
					penalty: 100,
				});
			}
			throw error;
		}
	}

	// execute inter block passed from generator
	public async execute(block: Block): Promise<void> {
		await this._mutex.runExclusive(async () => {
			await this._executeValidated(block);
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async start(): Promise<void> {
		this._endpoint.start();
	}

	public async stop(): Promise<void> {
		this._stop = true;
		// Add mutex to wait for the current mutex to finish
		await this._mutex.acquire();
		this._endpoint.stop();
	}

	public async getAggregateCommit(apiContext: APIContext): Promise<AggregateCommit> {
		const aggCommit = await this._commitPool.getAggregateCommit(apiContext);
		return aggCommit;
	}

	public certifySingleCommit(blockHeader: BlockHeader, validatorInfo: ValidatorInfo): void {
		const singleCommit = this._commitPool.createSingleCommit(
			blockHeader,
			validatorInfo,
			this._chain.networkIdentifier,
		);
		this._commitPool.addCommit(singleCommit, true);
	}

	public async getMaxRemovalHeight(): Promise<number> {
		const finalizedBlockHeader = await this._chain.dataAccess.getBlockHeaderByHeight(
			this._chain.finalizedHeight,
		);
		return finalizedBlockHeader.aggregateCommit.height;
	}

	public isSynced(height: number, maxHeightPrevoted: number): boolean {
		const lastBlockHeader = this._chain.lastBlock.header;
		if (lastBlockHeader.version === 0) {
			return height <= lastBlockHeader.height && maxHeightPrevoted <= lastBlockHeader.height;
		}
		return (
			maxHeightPrevoted < lastBlockHeader.maxHeightPrevoted ||
			(maxHeightPrevoted === lastBlockHeader.maxHeightPrevoted && height < lastBlockHeader.height)
		);
	}

	private async _execute(block: Block, peerID: string): Promise<void> {
		if (this._stop) {
			return;
		}
		await this._mutex.runExclusive(async () => {
			this._logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Starting to process block',
			);
			const { lastBlock } = this._chain;
			const forkStatus = forkChoice(
				block.header,
				lastBlock.header,
				new Slots({
					genesisBlockTimestamp: this._genesisBlockTimestamp ?? 0,
					interval: this._genesisConfig.blockTime,
				}),
			);

			if (!forkStatusList.includes(forkStatus)) {
				this._logger.debug({ status: forkStatus, blockId: block.header.id }, 'Unknown fork status');
				throw new Error('Unknown fork status');
			}

			// Discarding block
			if (forkStatus === ForkStatus.DISCARD) {
				this._logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Discarding block',
				);
				this.events.emit(CONSENSUS_EVENT_FORK_DETECTED, {
					block,
				});
				return;
			}
			if (forkStatus === ForkStatus.IDENTICAL_BLOCK) {
				this._logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Block already processed',
				);
				return;
			}
			if (forkStatus === ForkStatus.DOUBLE_FORGING) {
				this._logger.warn(
					{
						id: block.header.id,
						generatorAddress: block.header.generatorAddress.toString('hex'),
					},
					'Discarding block due to double forging',
				);
				this.events.emit(CONSENSUS_EVENT_FORK_DETECTED, {
					block,
				});
				return;
			}
			// Discard block and move to different chain
			if (forkStatus === ForkStatus.DIFFERENT_CHAIN) {
				this._logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Detected different chain to sync',
				);
				this.events.emit(CONSENSUS_EVENT_FORK_DETECTED, {
					block,
				});
				// Sync requires decoded block
				await this._sync(block, peerID);
				return;
			}
			// Replacing a block
			if (forkStatus === ForkStatus.TIE_BREAK) {
				this._logger.info(
					{ id: lastBlock.header.id, height: lastBlock.header.height },
					'Received tie breaking block',
				);
				this.events.emit(CONSENSUS_EVENT_FORK_DETECTED, {
					block,
				});

				this._chain.validateBlock(block, {
					version: BLOCK_VERSION,
					acceptedModuleIDs: this._stateMachine.getAllModuleIDs(),
				});
				const previousLastBlock = objects.cloneDeep(lastBlock);
				await this._deleteBlock(lastBlock);
				try {
					await this._executeValidated(block);
				} catch (err) {
					this._logger.error(
						{
							id: block.header.id,
							previousBlockId: previousLastBlock.header.id,
							err: err as Error,
						},
						'Failed to apply newly received block. restoring previous block.',
					);
					await this._executeValidated(previousLastBlock, {
						skipBroadcast: true,
					});
				}
				return;
			}

			this._logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Processing valid block',
			);
			this._chain.validateBlock(block, {
				version: BLOCK_VERSION,
				acceptedModuleIDs: this._stateMachine.getAllModuleIDs(),
			});
			await this._executeValidated(block);

			this._network.applyNodeInfo({
				height: block.header.height,
				lastBlockID: block.header.id,
				maxHeightPrevoted: 0, // TODO: get maxHeightPrevoted from block assets
				blockVersion: block.header.version,
			});
		});
	}

	private async _executeValidated(
		block: Block,
		options: {
			skipBroadcast?: boolean;
			removeFromTempTable?: boolean;
		} = {},
	): Promise<Block> {
		const stateStore = new StateStore(this._db);
		const eventQueue = new EventQueue();
		const apiContext = createAPIContext({ stateStore, eventQueue });
		const ctx = new BlockContext({
			stateStore,
			eventQueue,
			networkIdentifier: this._chain.networkIdentifier,
			logger: this._logger,
			header: block.header,
			assets: block.assets,
			transactions: block.transactions,
		});
		await this._verify(block);
		await this._stateMachine.verifyAssets(ctx);

		if (!options.skipBroadcast) {
			this._network.send({ event: NETWORK_EVENT_POST_BLOCK, data: block });
			this.events.emit(CONSENSUS_EVENT_BLOCK_BROADCAST, {
				block,
			});
		}
		await this._stateMachine.executeBlock(ctx);

		const bftVotes = await this._bftAPI.getBFTHeights(apiContext);

		let { finalizedHeight } = this._chain;
		let finalizedHeightChangeRange;
		if (bftVotes.maxHeightPrecommitted > finalizedHeight) {
			finalizedHeightChangeRange = {
				from: finalizedHeight,
				to: bftVotes.maxHeightPrecommitted,
			};
			finalizedHeight = bftVotes.maxHeightPrecommitted;
		}

		// Result Validation
		// Verify validatorsHash
		await this._verifyValidatorsHash(apiContext, block);
		// Verify stateRoot
		const currentState = await this._prepareFinalizingState(
			stateStore,
			this._chain.lastBlock.header.stateRoot,
		);
		this._verifyStateRoot(block, currentState.smt.rootHash);

		const events = ctx.eventQueue.getEvents();
		await this._verifyEventRoot(block, events);

		await this._chain.saveBlock(block, events, currentState, finalizedHeight, {
			removeFromTempTable: options.removeFromTempTable ?? false,
		});

		const isFinalizedHeightChanged = !!finalizedHeightChangeRange;
		if (isFinalizedHeightChanged) {
			this.events.emit(CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED, finalizedHeightChangeRange);
		}

		this.events.emit(CONSENSUS_EVENT_BLOCK_NEW, block);
		return block;
	}

	private async _verify(block: Block): Promise<void> {
		const apiContext = createNewAPIContext(this._db);

		// Verify timestamp
		await this._verifyTimestamp(apiContext, block);

		// Verify height
		this._verifyAssetsHeight(block);

		// Verify previousBlockID
		this._verifyPreviousBlockID(block);

		// Verify generatorAddress
		await this._verifyGeneratorAddress(apiContext, block);

		// Verify BFT Properties
		await this._verifyBFTProperties(apiContext, block);

		// verify Block signature
		await this._verifyAssetsSignature(apiContext, block);

		// verify aggregate commits
		await this._verifyAggregateCommit(apiContext, block);
	}

	private async _verifyTimestamp(apiContext: APIContext, block: Block): Promise<void> {
		const blockSlotNumber = await this._validatorAPI.getSlotNumber(
			apiContext,
			block.header.timestamp,
		);
		// Check that block is not from the future
		const currentTimestamp = Math.floor(Date.now() / 1000);
		const currentSlotNumber = await this._validatorAPI.getSlotNumber(apiContext, currentTimestamp);
		if (blockSlotNumber > currentSlotNumber) {
			throw new Error(
				`Invalid timestamp ${
					block.header.timestamp
				} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}

		// Check that block slot is strictly larger than the block slot of previousBlock
		const { lastBlock } = this._chain;
		const previousBlockSlotNumber = await this._validatorAPI.getSlotNumber(
			apiContext,
			lastBlock.header.timestamp,
		);
		if (blockSlotNumber <= previousBlockSlotNumber) {
			throw new Error(
				`Invalid timestamp ${
					block.header.timestamp
				} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private _verifyPreviousBlockID(block: Block): void {
		const { lastBlock } = this._chain;

		if (!block.header.previousBlockID.equals(lastBlock.header.id)) {
			throw new Error(
				`Invalid previousBlockID ${block.header.previousBlockID.toString(
					'hex',
				)} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private _verifyAssetsHeight(block: Block): void {
		const { lastBlock } = this._chain;

		if (block.header.height !== lastBlock.header.height + 1) {
			throw new Error(
				`Invalid height ${block.header.height} of the block with id: ${block.header.id.toString(
					'hex',
				)}`,
			);
		}
	}

	private async _verifyGeneratorAddress(apiContext: APIContext, block: Block): Promise<void> {
		// Check that the generatorAddress has the correct length of 20 bytes
		if (block.header.generatorAddress.length !== 20) {
			throw new Error(
				`Invalid length of generatorAddress ${block.header.generatorAddress.toString(
					'hex',
				)} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
		const generatorAddress = await this._validatorAPI.getGeneratorAtTimestamp(
			apiContext,
			block.header.timestamp,
		);
		// Check that the block generator is eligible to generate in this block slot.
		if (!block.header.generatorAddress.equals(generatorAddress)) {
			throw new Error(
				`Generator with address ${block.header.generatorAddress.toString(
					'hex',
				)} of the block with id: ${block.header.id.toString(
					'hex',
				)} is ineligible to generate block for the current slot`,
			);
		}
	}

	private async _verifyBFTProperties(apiContext: APIContext, block: Block): Promise<void> {
		const bftParams = await this._bftAPI.getBFTHeights(apiContext);

		if (block.header.maxHeightPrevoted !== bftParams.maxHeightPrevoted) {
			throw new Error(
				`Invalid maxHeightPrevoted ${
					block.header.maxHeightPrevoted
				} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
		const isContradictingHeaders = await this._bftAPI.isHeaderContradictingChain(
			apiContext,
			block.header,
		);
		if (isContradictingHeaders) {
			throw new Error(
				`Contradicting headers for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _verifyAssetsSignature(apiContext: APIContext, block: Block): Promise<void> {
		const { generatorKey } = await this._validatorAPI.getValidatorAccount(
			apiContext,
			block.header.generatorAddress,
		);

		try {
			block.header.validateSignature(generatorKey, this._chain.networkIdentifier);
		} catch (error) {
			throw new Error(
				`Invalid signature ${block.header.signature.toString(
					'hex',
				)} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _verifyAggregateCommit(apiContext: APIContext, block: Block): Promise<void> {
		if (!block.header.aggregateCommit) {
			throw new Error(
				`Aggregate Commit is "undefined" for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
		const isVerified = await this._commitPool.verifyAggregateCommit(
			apiContext,
			block.header.aggregateCommit,
		);
		if (!isVerified) {
			throw new Error(
				`Invalid aggregateCommit for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _verifyValidatorsHash(apiContext: APIContext, block: Block): Promise<void> {
		if (!block.header.validatorsHash) {
			throw new Error(
				`Validators hash is "undefined" for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
		const { validatorsHash } = await this._bftAPI.getBFTParameters(
			apiContext,
			block.header.height + 1,
		);

		if (!block.header.validatorsHash.equals(validatorsHash)) {
			throw new Error(
				`Invalid validatorsHash ${block.header.validatorsHash?.toString(
					'hex',
				)} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private _verifyStateRoot(block: Block, stateRoot: Buffer): void {
		if (!block.header.stateRoot || !stateRoot.equals(block.header.stateRoot)) {
			throw new Error(
				`State root is not valid for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _verifyEventRoot(block: Block, events: Event[]): Promise<void> {
		if (events.length > MAX_EVENTS_PER_BLOCK) {
			throw new Error(`Number of events cannot exceed ${MAX_EVENTS_PER_BLOCK} per block`);
		}
		const smtStore = new SMTStore(new InMemoryKVStore());
		const smt = new SparseMerkleTree({
			db: smtStore,
			keyLength: EVENT_KEY_LENGTH,
		});
		for (const e of events) {
			const pairs = e.keyPair();
			for (const pair of pairs) {
				await smt.update(pair.key, pair.value);
			}
		}
		if (!block.header.eventRoot || !smt.rootHash.equals(block.header.eventRoot)) {
			throw new Error(
				`Event root is not valid for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _deleteBlock(block: Block, saveTempBlock = false): Promise<void> {
		if (block.header.height <= this._chain.finalizedHeight) {
			throw new Error('Can not delete block below or same as finalized height');
		}

		// Offset must be set to 1, because lastBlock is still this deleting block
		const stateStore = new StateStore(this._db);
		const currentState = await this._prepareFinalizingState(
			stateStore,
			this._chain.lastBlock.header.stateRoot,
			false,
		);
		await this._chain.removeBlock(block, currentState, { saveTempBlock });
		this.events.emit(CONSENSUS_EVENT_BLOCK_DELETE, block);
	}

	private async _prepareFinalizingState(
		stateStore: StateStore,
		stateRoot?: Buffer,
		finalize = true,
	): Promise<CurrentState> {
		const batch = this._db.batch();
		const smtStore = new SMTStore(this._db);
		const smt = new SparseMerkleTree({
			db: smtStore,
			rootHash: stateRoot,
		});

		// On save, use finalize flag to finalize stores
		if (finalize) {
			const diff = await stateStore.finalize(batch, smt);
			smtStore.finalize(batch);

			return {
				batch,
				diff,
				stateStore,
				smt,
				smtStore,
			};
		}

		return {
			batch,
			// Pass initialized diff as its not needed on delete block
			diff: { created: [], updated: [], deleted: [] },
			stateStore,
			smt,
			smtStore,
		};
	}

	private async _deleteLastBlock({ saveTempBlock = false }: DeleteOptions = {}): Promise<void> {
		if (this._stop) {
			return;
		}
		await this._mutex.runExclusive(async () => {
			const { lastBlock } = this._chain;
			this._logger.debug(
				{ id: lastBlock.header.id, height: lastBlock.header.height },
				'Deleting last block',
			);
			await this._deleteBlock(lastBlock, saveTempBlock);
			return this._chain.lastBlock;
		});
	}

	private async _sync(block: Block, peerID: string): Promise<void> {
		if (this._stop) {
			return;
		}
		try {
			await this._synchronizer.run(block, peerID);
		} catch (error) {
			if (error instanceof ApplyPenaltyAndRestartError) {
				this._network.applyPenaltyOnPeer({ peerId: peerID, penalty: 100 });
				await this._sync(block, peerID);
				return;
			}

			if (error instanceof RestartError) {
				await this._sync(block, peerID);
				return;
			}

			if (error instanceof AbortError) {
				this._logger.info({ error, reason: error.reason }, 'Aborting synchronization mechanism');
				return;
			}
			throw error;
		}
	}

	private _createBlockExecutor(): BlockExecutor {
		const apiContext = createNewAPIContext(this._db);
		return {
			deleteLastBlock: async (options: DeleteOptions = {}) => this._deleteLastBlock(options),
			executeValidated: async (block: Block, options?: ExecuteOptions) =>
				this._executeValidated(block, options),
			validate: (block: Block) =>
				this._chain.validateBlock(block, {
					version: BLOCK_VERSION,
					acceptedModuleIDs: this._stateMachine.getAllModuleIDs(),
				}),
			verify: async (block: Block) => this._verify(block),
			getCurrentValidators: async () => this._bftAPI.getCurrentValidators(apiContext),
			getSlotNumber: async timestamp => this._validatorAPI.getSlotNumber(apiContext, timestamp),
			getFinalizedHeight: () => this.finalizedHeight(),
		};
	}
}
