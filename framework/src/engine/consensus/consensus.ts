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
	StateStore,
	BlockHeader,
	MAX_EVENTS_PER_BLOCK,
	EVENT_KEY_LENGTH,
} from '@liskhq/lisk-chain';
import { jobHandlers, objects } from '@liskhq/lisk-utils';
import { Database, Batch, SparseMerkleTree } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { address, utils } from '@liskhq/lisk-cryptography';
import { Logger } from '../../logger';
import {
	BlockSynchronizationMechanism,
	FastChainSwitchingMechanism,
	Synchronizer,
} from './synchronizer';
import { ApplyPenaltyError } from '../../errors';
import { AbortError, ApplyPenaltyAndRestartError, RestartError } from './synchronizer/errors';
import { BlockExecutor } from './synchronizer/type';
import { Network } from '../network';
import { NetworkEndpoint, EndpointArgs } from './network_endpoint';
import { LegacyNetworkEndpoint } from '../legacy/network_endpoint';
import { EventPostBlockData, postBlockEventSchema } from './schema';
import {
	CONSENSUS_EVENT_BLOCK_BROADCAST,
	CONSENSUS_EVENT_BLOCK_DELETE,
	CONSENSUS_EVENT_BLOCK_NEW,
	CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED,
	CONSENSUS_EVENT_FORK_DETECTED,
	CONSENSUS_EVENT_NETWORK_BLOCK_NEW,
	CONSENSUS_EVENT_VALIDATORS_CHANGED,
	EMPTY_HASH,
	NETWORK_EVENT_POST_BLOCK,
	NETWORK_EVENT_POST_NODE_INFO,
	NETWORK_RPC_GET_BLOCKS_FROM_ID,
	NETWORK_RPC_GET_HIGHEST_COMMON_BLOCK,
	NETWORK_RPC_GET_LAST_BLOCK,
	NETWORK_LEGACY_GET_BLOCKS,
} from './constants';
import { GenesisConfig } from '../../types';
import { AggregateCommit } from './types';
import { forkChoice, ForkStatus } from './fork_choice/fork_choice_rule';
import { CommitPool } from './certificate_generation/commit_pool';
import { ValidatorInfo } from './certificate_generation/types';
import { BFTModule } from '../bft';
import { ABI, TransactionExecutionResult, TransactionVerifyResult } from '../../abi';
import { isEmptyConsensusUpdate } from './utils';

interface ConsensusArgs {
	chain: Chain;
	network: Network;
	genesisConfig: GenesisConfig;
	abi: ABI;
	bft: BFTModule;
}

interface InitArgs {
	logger: Logger;
	genesisBlock: Block;
	db: Database;
	legacyDB: Database;
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

	private readonly _abi: ABI;
	private readonly _chain: Chain;
	private readonly _network: Network;
	private readonly _mutex: jobHandlers.Mutex;
	private readonly _bft: BFTModule;
	private readonly _genesisConfig: GenesisConfig;

	// init parameters
	private _logger!: Logger;
	private _db!: Database;
	private _commitPool!: CommitPool;
	private _endpoint!: NetworkEndpoint;
	private _legacyEndpoint!: LegacyNetworkEndpoint;
	private _synchronizer!: Synchronizer;
	private _blockSlot!: Slots;

	private _stop = false;

	public constructor(args: ConsensusArgs) {
		this.events = new EventEmitter();
		this._chain = args.chain;
		this._abi = args.abi;
		this._network = args.network;
		this._mutex = new jobHandlers.Mutex();
		this._bft = args.bft;
		this._genesisConfig = args.genesisConfig;
	}

	public async init(args: InitArgs): Promise<void> {
		this._logger = args.logger;
		this._db = args.db;
		this._commitPool = new CommitPool({
			db: this._db,
			blockTime: this._genesisConfig.blockTime,
			bftMethod: this._bft.method,
			chain: this._chain,
			network: this._network,
		});
		this._endpoint = new NetworkEndpoint({
			chain: this._chain,
			logger: this._logger,
			network: this._network,
			db: this._db,
		} as EndpointArgs); // TODO: Remove casting in issue where commitPool is added here
		this._legacyEndpoint = new LegacyNetworkEndpoint({
			logger: this._logger,
			network: this._network,
			db: args.legacyDB,
		});
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
		this._blockSlot = new Slots({
			genesisBlockTimestamp: args.genesisBlock.header.timestamp,
			interval: this._genesisConfig.blockTime,
		});

		this._network.registerEndpoint(NETWORK_LEGACY_GET_BLOCKS, async ({ data, peerId }) =>
			this._legacyEndpoint.handleRPCGetLegacyBlocksFromId(data, peerId),
		);
		this._network.registerEndpoint(NETWORK_RPC_GET_LAST_BLOCK, ({ peerId }) =>
			this._endpoint.handleRPCGetLastBlock(peerId),
		);
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
			const genesisEvents = await this._executeGenesisBlock(stateStore, args.genesisBlock);
			const bftParams = await this._bft.method.getBFTParameters(
				stateStore,
				args.genesisBlock.header.height + 1,
			);

			if (
				!args.genesisBlock.header.validatorsHash ||
				!bftParams.validatorsHash.equals(args.genesisBlock.header.validatorsHash)
			) {
				throw new Error('Genesis block validators hash is invalid');
			}
			await this._verifyEventRoot(args.genesisBlock, genesisEvents);

			const batch = new Batch();
			const diff = stateStore.finalize(batch);

			await this._chain.saveBlock(
				args.genesisBlock,
				genesisEvents,
				{ batch, diff, stateStore },
				args.genesisBlock.header.height,
			);
		}
		await this._chain.loadLastBlocks(args.genesisBlock);
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

		this.events.emit(CONSENSUS_EVENT_NETWORK_BLOCK_NEW, { block });

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
		try {
			// setting peerID to localhost with non existing port because this function is only called internally.
			await this._execute(block, '127.0.0.1:0');
		} catch (error) {
			await this._abi.clear({});
			this._logger.error({ err: error as Error }, 'Fail to execute block.');
		}
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

	public async getAggregateCommit(methodContext: StateStore): Promise<AggregateCommit> {
		const aggCommit = await this._commitPool.getAggregateCommit(methodContext);
		return aggCommit;
	}

	public certifySingleCommit(blockHeader: BlockHeader, validatorInfo: ValidatorInfo): void {
		const singleCommit = this._commitPool.createSingleCommit(
			blockHeader,
			validatorInfo,
			this._chain.chainID,
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
	public async getGeneratorAtTimestamp(
		stateStore: StateStore,
		height: number,
		timestamp: number,
	): Promise<Buffer> {
		const generators = await this._bft.method.getGeneratorKeys(stateStore, height);
		const currentSlot = this._blockSlot.getSlotNumber(timestamp);
		const generator = generators[currentSlot % generators.length];
		return generator.address;
	}

	public getSlotNumber(timestamp: number): number {
		return this._blockSlot.getSlotNumber(timestamp);
	}

	public getSlotTime(slot: number): number {
		return this._blockSlot.getSlotTime(slot);
	}

	public async getConsensusParams(stateStore: StateStore, header: BlockHeader) {
		const bftParams = await this._bft.method.getBFTParameters(stateStore, header.height);
		const generatorKeys = await this._bft.method.getGeneratorKeys(stateStore, header.height);
		const validators = generatorKeys.map(generator => {
			const bftValidator = bftParams.validators.find(v => v.address.equals(generator.address));
			return {
				...generator,
				bftWeight: bftValidator?.bftWeight ?? BigInt(0),
				blsKey: bftValidator?.blsKey ?? Buffer.alloc(0),
			};
		});
		const implyMaxPrevote = await this._bft.method.currentHeaderImpliesMaximalPrevotes(stateStore);
		const { maxHeightCertified } = await this._bft.method.getBFTHeights(stateStore);
		return {
			currentValidators: validators,
			implyMaxPrevote,
			maxHeightCertified,
			certificateThreshold: bftParams.certificateThreshold,
		};
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
			const forkStatus = forkChoice(block.header, lastBlock.header, this._blockSlot);

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
				this._logger.info(
					{
						id: block.header.id,
						height: block.header.height,
						generator: address.getLisk32AddressFromAddress(block.header.generatorAddress),
						maxHeightPrevoted: block.header.maxHeightPrevoted,
						maxHeightGenerated: block.header.maxHeightGenerated,
					},
					'Detected a fork',
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
						generatorAddress: address.getLisk32AddressFromAddress(block.header.generatorAddress),
					},
					'Discarding block due to double forging',
				);
				this._logger.info(
					{
						id: block.header.id,
						height: block.header.height,
						generator: address.getLisk32AddressFromAddress(block.header.generatorAddress),
						maxHeightPrevoted: block.header.maxHeightPrevoted,
						maxHeightGenerated: block.header.maxHeightGenerated,
					},
					'Detected a fork',
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
				this._logger.info(
					{
						id: block.header.id,
						height: block.header.height,
						generator: address.getLisk32AddressFromAddress(block.header.generatorAddress),
						maxHeightPrevoted: block.header.maxHeightPrevoted,
						maxHeightGenerated: block.header.maxHeightGenerated,
					},
					'Detected a fork',
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
				this._logger.info(
					{
						id: block.header.id,
						height: block.header.height,
						generator: address.getLisk32AddressFromAddress(block.header.generatorAddress),
						maxHeightPrevoted: block.header.maxHeightPrevoted,
						maxHeightGenerated: block.header.maxHeightGenerated,
					},
					'Detected a fork',
				);
				this.events.emit(CONSENSUS_EVENT_FORK_DETECTED, {
					block,
				});

				this._chain.validateBlock(block, {
					version: BLOCK_VERSION,
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
			});
			await this._executeValidated(block);

			// Since legacy property is optional we don't need to send it here
			this._network.applyNodeInfo({
				height: block.header.height,
				lastBlockID: block.header.id,
				maxHeightPrevoted: block.header.maxHeightPrevoted,
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
		await this._verify(block);
		const contextID = await this._verifyAssets(block);

		if (!options.skipBroadcast) {
			this._network.send({ event: NETWORK_EVENT_POST_BLOCK, data: block.getBytes() });
			this._logger.debug(
				{
					id: block.header.id,
					height: block.header.height,
					generator: address.getLisk32AddressFromAddress(block.header.generatorAddress),
					numberOfTransactions: block.transactions.length,
					numberOfAssets: block.assets.getAll().length,
				},
				'Block broadcasted',
			);
			this.events.emit(CONSENSUS_EVENT_BLOCK_BROADCAST, {
				block,
			});
		}
		const events = await this._executeBlock(contextID, stateStore, block);

		const bftVotes = await this._bft.method.getBFTHeights(stateStore);

		let { finalizedHeight } = this._chain;
		let finalizedHeightChangeRange;
		if (bftVotes.maxHeightPrecommitted > finalizedHeight) {
			finalizedHeightChangeRange = {
				from: finalizedHeight,
				to: bftVotes.maxHeightPrecommitted,
			};
			finalizedHeight = bftVotes.maxHeightPrecommitted;
		}

		await this._verifyValidatorsHash(stateStore, block);
		await this._verifyEventRoot(block, events);

		const batch = new Batch();
		const diff = stateStore.finalize(batch);

		await this._commitBlock(contextID, block);
		await this._chain.saveBlock(block, events, { batch, diff, stateStore }, finalizedHeight, {
			removeFromTempTable: options.removeFromTempTable ?? false,
		});

		const isFinalizedHeightChanged = !!finalizedHeightChangeRange;
		if (isFinalizedHeightChanged) {
			await this._abi.finalize({
				finalizedHeight,
			});
			this.events.emit(CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED, finalizedHeightChangeRange);
		}

		this.events.emit(CONSENSUS_EVENT_BLOCK_NEW, { block });
		this._logger.info(
			{
				id: block.header.id,
				height: block.header.height,
				generator: address.getLisk32AddressFromAddress(block.header.generatorAddress),
				numberOfTransactions: block.transactions.length,
				numberOfAssets: block.assets.getAll().length,
				numberOfEvents: events.length,
			},
			'Block executed',
		);
		return block;
	}

	private async _verify(block: Block): Promise<void> {
		const stateStore = new StateStore(this._db);

		// Verify timestamp
		this._verifyTimestamp(block);

		// Verify height
		this._verifyAssetsHeight(block);

		// Verify previousBlockID
		this._verifyPreviousBlockID(block);

		// Verify generatorAddress
		await this._verifyGeneratorAddress(stateStore, block);

		// Verify BFT Properties
		await this._verifyBFTProperties(stateStore, block);

		// verify Block signature
		await this._verifyAssetsSignature(stateStore, block);

		// verify aggregate commits
		await this._verifyAggregateCommit(stateStore, block);
	}

	private _verifyTimestamp(block: Block): void {
		const blockSlotNumber = this._blockSlot.getSlotNumber(block.header.timestamp);
		// Check that block is not from the future
		const currentTimestamp = Math.floor(Date.now() / 1000);
		const currentSlotNumber = this._blockSlot.getSlotNumber(currentTimestamp);
		if (blockSlotNumber > currentSlotNumber) {
			throw new Error(
				`Invalid timestamp ${
					block.header.timestamp
				} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}

		// Check that block slot is strictly larger than the block slot of previousBlock
		const { lastBlock } = this._chain;
		const previousBlockSlotNumber = this._blockSlot.getSlotNumber(lastBlock.header.timestamp);
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

	private async _verifyGeneratorAddress(stateStore: StateStore, block: Block): Promise<void> {
		// Check that the generatorAddress has the correct length of 20 bytes
		if (block.header.generatorAddress.length !== 20) {
			throw new Error(
				`Invalid length of generatorAddress ${block.header.generatorAddress.toString(
					'hex',
				)} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
		const generatorAddress = await this.getGeneratorAtTimestamp(
			stateStore,
			block.header.height,
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

	private async _verifyBFTProperties(stateStore: StateStore, block: Block): Promise<void> {
		const bftParams = await this._bft.method.getBFTHeights(stateStore);

		if (block.header.maxHeightPrevoted !== bftParams.maxHeightPrevoted) {
			throw new Error(
				`Invalid maxHeightPrevoted ${
					block.header.maxHeightPrevoted
				} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
		const isContradictingHeaders = await this._bft.method.isHeaderContradictingChain(
			stateStore,
			block.header,
		);
		if (isContradictingHeaders) {
			throw new Error(
				`Contradicting headers for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _verifyAssetsSignature(stateStore: StateStore, block: Block): Promise<void> {
		const generatorKeys = await this._bft.method.getGeneratorKeys(stateStore, block.header.height);
		const generator = generatorKeys.find(gen => gen.address.equals(block.header.generatorAddress));
		if (!generator) {
			throw new Error(
				`Validator with address ${block.header.generatorAddress.toString(
					'hex',
				)} does not exist for height ${block.header.height}`,
			);
		}

		try {
			block.header.validateSignature(generator.generatorKey, this._chain.chainID);
		} catch (error) {
			throw new Error(
				`Invalid signature ${block.header.signature.toString(
					'hex',
				)} of the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _verifyAggregateCommit(stateStore: StateStore, block: Block): Promise<void> {
		if (!block.header.aggregateCommit) {
			throw new Error(
				`Aggregate Commit is "undefined" for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
		const isVerified = await this._commitPool.verifyAggregateCommit(
			stateStore,
			block.header.aggregateCommit,
		);
		if (!isVerified) {
			throw new Error(
				`Invalid aggregateCommit for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _verifyValidatorsHash(methodContext: StateStore, block: Block): Promise<void> {
		if (!block.header.validatorsHash) {
			throw new Error(
				`Validators hash is "undefined" for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
		const { validatorsHash } = await this._bft.method.getBFTParameters(
			methodContext,
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

	private async _verifyEventRoot(block: Block, events: Event[]): Promise<void> {
		if (events.length > MAX_EVENTS_PER_BLOCK) {
			throw new Error(`Number of events cannot exceed ${MAX_EVENTS_PER_BLOCK} per block`);
		}
		const smt = new SparseMerkleTree(EVENT_KEY_LENGTH);
		const keypairs = [];
		for (const e of events) {
			const pairs = e.keyPair();
			for (const pair of pairs) {
				keypairs.push(pair);
			}
		}
		const eventRoot = await smt.update(EMPTY_HASH, keypairs);
		if (!block.header.eventRoot || !eventRoot.equals(block.header.eventRoot)) {
			throw new Error(
				`Event root is not valid for the block with id: ${block.header.id.toString('hex')}`,
			);
		}
	}

	private async _deleteBlock(block: Block, saveTempBlock = false): Promise<void> {
		if (block.header.height <= this._chain.finalizedHeight) {
			throw new Error('Can not delete block below or same as finalized height');
		}
		let expectedStateRoot = EMPTY_HASH;
		if (block.header.height - 1 > 0) {
			const secondLastBlockHeader = await this._chain.dataAccess.getBlockHeaderByHeight(
				block.header.height - 1,
			);
			expectedStateRoot = secondLastBlockHeader.stateRoot as Buffer;
		}
		try {
			const { contextID } = await this._abi.initStateMachine({
				header: block.header.toObject(),
			});
			await this._abi.revert({
				contextID,
				expectedStateRoot,
				stateRoot: block.header.stateRoot as Buffer,
			});
		} finally {
			await this._abi.clear({});
		}

		// Offset must be set to 1, because lastBlock is still this deleting block
		const stateStore = new StateStore(this._db);
		const batch = new Batch();
		await this._chain.removeBlock(
			block,
			{ batch, diff: { created: [], updated: [], deleted: [] }, stateStore },
			{ saveTempBlock },
		);
		this.events.emit(CONSENSUS_EVENT_BLOCK_DELETE, { block });
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
		const stateStore = new StateStore(this._db);
		return {
			deleteLastBlock: async (options: DeleteOptions = {}) => this._deleteLastBlock(options),
			executeValidated: async (block: Block, options?: ExecuteOptions) =>
				this._executeValidated(block, options),
			validate: (block: Block) =>
				this._chain.validateBlock(block, {
					version: BLOCK_VERSION,
				}),
			verify: async (block: Block) => this._verify(block),
			getCurrentValidators: async () => {
				const nextHeight = this._chain.lastBlock.header.height + 1;
				const bftParams = await this._bft.method.getBFTParameters(stateStore, nextHeight);
				return bftParams.validators;
			},
			getSlotNumber: timestamp => this._blockSlot.getSlotNumber(timestamp),
			getFinalizedHeight: () => this.finalizedHeight(),
		};
	}

	private async _verifyAssets(block: Block): Promise<Buffer> {
		try {
			const { contextID } = await this._abi.initStateMachine({
				header: block.header.toObject(),
			});
			await this._abi.verifyAssets({
				contextID,
				assets: block.assets.getAll(),
			});
			return contextID;
		} catch (err) {
			await this._abi.clear({});
			throw err;
		}
	}

	private async _executeBlock(
		contextID: Buffer,
		stateStore: StateStore,
		block: Block,
	): Promise<Event[]> {
		try {
			await this._bft.beforeTransactionsExecute(stateStore, block.header);
			const consensus = await this.getConsensusParams(stateStore, block.header);

			const events = [];
			const beforeResult = await this._abi.beforeTransactionsExecute({
				contextID,
				assets: block.assets.getAll(),
				consensus,
			});
			events.push(...beforeResult.events);
			for (const transaction of block.transactions) {
				const { result: verifyResult } = await this._abi.verifyTransaction({
					contextID,
					transaction: transaction.toObject(),
					header: block.header.toObject(),
				});
				if (verifyResult !== TransactionVerifyResult.OK) {
					this._logger.debug(`Failed to verify transaction ${transaction.id.toString('hex')}`);
					throw new Error(`Failed to verify transaction ${transaction.id.toString('hex')}.`);
				}
				const txExecResult = await this._abi.executeTransaction({
					contextID,
					assets: block.assets.getAll(),
					dryRun: false,
					header: block.header.toObject(),
					transaction: transaction.toObject(),
					consensus,
				});
				if (txExecResult.result === TransactionExecutionResult.INVALID) {
					this._logger.debug(`Failed to execute transaction ${transaction.id.toString('hex')}`);
					throw new Error(`Failed to execute transaction ${transaction.id.toString('hex')}.`);
				}
				events.push(...txExecResult.events);
			}
			const afterResult = await this._abi.afterTransactionsExecute({
				contextID,
				assets: block.assets.getAll(),
				consensus,
				transactions: block.transactions.map(tx => tx.toObject()),
			});
			events.push(...afterResult.events);

			if (
				!isEmptyConsensusUpdate(
					afterResult.preCommitThreshold,
					afterResult.certificateThreshold,
					afterResult.nextValidators,
				)
			) {
				const activeValidators = afterResult.nextValidators.filter(
					validator => validator.bftWeight > BigInt(0),
				);
				await this._bft.method.setBFTParameters(
					stateStore,
					afterResult.preCommitThreshold,
					afterResult.certificateThreshold,
					activeValidators,
				);
				await this._bft.method.setGeneratorKeys(stateStore, afterResult.nextValidators);
				this.events.emit(CONSENSUS_EVENT_VALIDATORS_CHANGED, {
					preCommitThreshold: afterResult.preCommitThreshold,
					certificateThreshold: afterResult.certificateThreshold,
					nextValidators: afterResult.nextValidators,
				});
			}

			return events.map((e, i) => {
				const event = new Event(e);
				event.setIndex(i);
				return event;
			});
		} catch (err) {
			await this._abi.clear({});
			throw err;
		}
	}

	private async _commitBlock(contextID: Buffer, block: Block): Promise<void> {
		try {
			await this._abi.commit({
				contextID,
				dryRun: false,
				expectedStateRoot: block.header.stateRoot as Buffer,
				stateRoot: this._chain.lastBlock.header.stateRoot as Buffer,
			});
		} finally {
			await this._abi.clear({});
		}
	}

	private async _executeGenesisBlock(
		stateStore: StateStore,
		genesisBlock: Block,
	): Promise<Event[]> {
		try {
			const { contextID } = await this._abi.initStateMachine({
				header: genesisBlock.header.toObject(),
			});
			if (!genesisBlock.header.stateRoot) {
				throw new Error('Genesis block stateRoot must not be empty.');
			}
			await this._bft.initGenesisState(stateStore, genesisBlock.header);
			const result = await this._abi.initGenesisState({
				contextID,
				stateRoot: genesisBlock.header.stateRoot,
			});
			const activeValidators = result.nextValidators.filter(
				validator => validator.bftWeight > BigInt(0),
			);
			await this._bft.method.setBFTParameters(
				stateStore,
				result.preCommitThreshold,
				result.certificateThreshold,
				activeValidators,
			);
			await this._bft.method.setGeneratorKeys(stateStore, result.nextValidators);
			this.events.emit(CONSENSUS_EVENT_VALIDATORS_CHANGED, {
				preCommitThreshold: result.preCommitThreshold,
				certificateThreshold: result.certificateThreshold,
				nextValidators: result.nextValidators,
			});

			await this._abi.commit({
				contextID,
				dryRun: false,
				stateRoot: utils.hash(Buffer.alloc(0)),
				expectedStateRoot: genesisBlock.header.stateRoot,
			});
			return result.events.map((e, i) => {
				const event = new Event(e);
				event.setIndex(i);
				return event;
			});
		} finally {
			await this._abi.clear({});
		}
	}
}
