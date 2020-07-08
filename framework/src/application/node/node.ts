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

import { Chain, events as chainEvents, Block, blockSchema, blockHeaderSchema, Account } from '@liskhq/lisk-chain';
import { Dpos, constants as dposConstants } from '@liskhq/lisk-dpos';
import { EVENT_BFT_BLOCK_FINALIZED, BFT } from '@liskhq/lisk-bft';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { GenesisBlock } from '@liskhq/lisk-genesis';
import { TransactionPool, Job, events as txPoolEvents } from '@liskhq/lisk-transaction-pool';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import { Schema } from '@liskhq/lisk-codec';
import { Sequence } from './utils/sequence';
import { Forger, RegisteredDelegate } from './forger';
import {
	Transport,
	HandleRPCGetTransactionsReturn,
	handlePostTransactionReturn,
} from './transport';
import {
	Synchronizer,
	BlockSynchronizationMechanism,
	FastChainSwitchingMechanism,
} from './synchronizer';
import { Processor } from './processor';
import { BlockProcessorV2 } from './block_processor_v2';
import { BlockProcessorV0 } from './block_processor_v0';
import { Logger } from '../logger';
import { CodecSchema, EventPostTransactionData } from '../../types';
import { InMemoryChannel } from '../../controller/channels';
import { EventInfoObject } from '../../controller/event';
import { ApplicationState } from '../application_state';
import { accountAssetSchema, defaultAccountAsset, AccountAsset } from './account';
import {
	EVENT_PROCESSOR_BROADCAST_BLOCK,
	EVENT_PROCESSOR_SYNC_REQUIRED,
} from './processor/processor';
import { EVENT_SYNCHRONIZER_SYNC_REQUIRED } from './synchronizer/base_synchronizer';
import { Network } from '../network';

const forgeInterval = 1000;
const { EVENT_NEW_BLOCK, EVENT_DELETE_BLOCK } = chainEvents;
const { EVENT_ROUND_CHANGED } = dposConstants;
const { EVENT_TRANSACTION_REMOVED } = txPoolEvents;

export interface NodeConstants {
	readonly maxPayloadLength: number;
	readonly activeDelegates: number;
	readonly standbyDelegates: number;
	readonly delegateListRoundOffset: number;
	readonly rewards: {
		readonly distance: number;
		readonly offset: number;
		readonly milestones: string[];
	};
	readonly totalAmount: bigint;
	readonly blockTime: number;
}

export interface Options {
	readonly version: string;
	readonly protocolVersion: string;
	readonly networkId: string;
	readonly label: string;
	readonly rootPath: string;
	readonly communityIdentifier: string;
	readonly forging: {
		readonly waitThreshold: number;
		readonly delegates: RegisteredDelegate[];
		readonly force?: boolean;
		readonly defaultPassword?: string;
	};
	readonly constants: NodeConstants;
	readonly registeredTransactions: {
		readonly [key: number]: typeof BaseTransaction;
	};
	genesisBlock: GenesisBlock<AccountAsset>;
	readonly genesisConfig: object;
}

interface NodeConstructor {
	readonly channel: InMemoryChannel;
	readonly options: Options;
	readonly logger: Logger;
	readonly forgerDB: KVStore;
	readonly blockchainDB: KVStore;
	readonly applicationState: ApplicationState;
	readonly networkModule: Network;
}

interface RegisteredSchemas {
	[key: string]: Schema;
}

export class Node {
	private readonly _channel: InMemoryChannel;
	private readonly _options: Options;
	private readonly _logger: Logger;
	private readonly _forgerDB: KVStore;
	private readonly _blockchainDB: KVStore;
	private readonly _applicationState: ApplicationState;
	private readonly _networkModule: Network;
	private _sequence!: Sequence;
	private _networkIdentifier!: Buffer;
	private _chain!: Chain;
	private _bft!: BFT;
	private _dpos!: Dpos;
	private _processor!: Processor;
	private _synchronizer!: Synchronizer;
	private _transactionPool!: TransactionPool;
	private _transport!: Transport;
	private _forger!: Forger;
	private _forgingJob!: Job<void>;

	public constructor({
		channel,
		options,
		logger,
		blockchainDB,
		forgerDB,
		applicationState,
		networkModule,
	}: NodeConstructor) {
		this._channel = channel;
		this._options = options;
		this._logger = logger;
		this._applicationState = applicationState;
		this._blockchainDB = blockchainDB;
		this._forgerDB = forgerDB;
		this._networkModule = networkModule;
	}

	public async bootstrap(): Promise<void> {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!this._options.genesisBlock) {
				throw Error('Missing genesis block');
			}

			if (this._options.forging.waitThreshold >= this._options.constants.blockTime) {
				throw Error(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					`forging.waitThreshold=${this._options.forging.waitThreshold} is greater or equal to genesisConfig.blockTime=${this._options.constants.blockTime}. It impacts the forging and propagation of blocks. Please use a smaller value for forging.waitThreshold`,
				);
			}

			this._sequence = new Sequence({
				onWarning: (current: number): void => {
					this._logger.warn({ queueLength: current }, 'Main queue');
				},
			});

			this._initModules();

			this._processor.register(
				new BlockProcessorV0({
					dposModule: this._dpos,
					logger: this._logger,
					constants: {
						roundLength:
							this._options.constants.activeDelegates + this._options.constants.standbyDelegates,
					},
				}),
				{
					matcher: header => header.version === this._options.genesisBlock.header.version,
				},
			);

			this._processor.register(
				new BlockProcessorV2({
					networkIdentifier: this._networkIdentifier,
					chainModule: this._chain,
					bftModule: this._bft,
					dposModule: this._dpos,
					logger: this._logger,
					constants: this._options.constants,
					forgerDB: this._forgerDB,
				}),
			);

			this._channel.subscribe('app:state:updated', (event: EventInfoObject) => {
				Object.assign(this._applicationState, event.data);
			});

			this._logger.info('Node ready and launched');
			// After binding, it should immediately load blockchain
			await this._processor.init();
			// Check if blocks are left in temp_blocks table
			await this._synchronizer.init();

			// Update Application State after processor is initialized
			this._applicationState.update({
				height: this._chain.lastBlock.header.height,
				lastBlockId: this._chain.lastBlock.header.id.toString('base64'),
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
				maxHeightPrevoted:
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					this._chain.lastBlock.header.asset.maxHeightPrevoted ?? 0,
				blockVersion: this._chain.lastBlock.header.version,
			});

			this._subscribeToEvents();

			this._channel.subscribe(
				'app:network:ready',
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				async (_event: EventInfoObject) => {
					await this._startLoader();
				},
			);

			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			this._channel.subscribe('app:ready', async (_event: EventInfoObject) => {
				await this._transactionPool.start();
				await this._startForging();
			});

			// Avoid receiving blocks/transactions from the network during snapshotting process
			this._channel.subscribe(
				'app:network:event',
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				async (info: EventInfoObject) => {
					const {
						data: { event, data, peerId },
					} = info as {
						data: { event: string; data: unknown; peerId: string };
					};
					try {
						if (event === 'postTransactionsAnnouncement') {
							await this._transport.handleEventPostTransactionsAnnouncement(data, peerId);
							return;
						}
						if (event === 'postBlock') {
							await this._transport.handleEventPostBlock(data, peerId);
							return;
						}
					} catch (err) {
						this._logger.warn(
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
							{ err, event },
							'Received invalid event message',
						);
					}
				},
			);
		} catch (error) {
			this._logger.fatal(
				{
					message: (error as Error).message,
					stack: (error as Error).stack,
				},
				'Failed to initialization node',
			);
			throw error;
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/explicit-function-return-type
	public get actions() {
		return {
			calculateSupply: (params: { height: number }): bigint =>
				this._chain.blockReward.calculateSupply(params.height),
			calculateMilestone: (params: { height: number }): number =>
				this._chain.blockReward.calculateMilestone(params.height),
			calculateReward: (params: { height: number }): bigint =>
				this._chain.blockReward.calculateReward(params.height),
			getForgerAddressesForRound: async (params: { round: number }): Promise<readonly string[]> => {
				const forgersAddress = await this._dpos.getForgerAddressesForRound(params.round);
				return forgersAddress.map(a => a.toString('base64'));
			},
			updateForgingStatus: async (params: {
				publicKey: string;
				password: string;
				forging: boolean;
			}): Promise<{ address: string; forging: boolean }> => {
				const result = await this._forger.updateForgingStatus(
					Buffer.from(params.publicKey, 'base64'),
					params.password,
					params.forging,
				);

				return {
					address: result.address.toString('base64'),
					forging: result.forging,
				};
			},
			getAccount: async (params: { address: string }): Promise<string> => {
				const account = await this._chain.dataAccess.getAccountByAddress(
					Buffer.from(params.address, 'base64'),
				);
				return this._chain.dataAccess.encodeAccount(account).toString('base64');
			},
			getAccounts: async (params: { address: readonly string[] }): Promise<readonly string[]> => {
				const accounts = await this._chain.dataAccess.getAccountsByAddress(
					params.address.map(address => Buffer.from(address, 'base64')),
				);
				return accounts.map(account =>
					this._chain.dataAccess.encodeAccount(account).toString('base64'),
				);
			},
			getBlockByID: async (params: { id: string }): Promise<string | undefined> => {
				try {
					const block = await this._chain.dataAccess.getBlockByID(Buffer.from(params.id, 'base64'));
					return this._chain.dataAccess.encode(block).toString('base64');
				} catch (error) {
					if (error instanceof NotFoundError) {
						return undefined;
					}
					throw error;
				}
			},
			getBlocksByIDs: async (params: { ids: readonly string[] }): Promise<readonly string[]> => {
				const blocks = [];
				try {
					for (const id of params.ids) {
						const block = await this._chain.dataAccess.getBlockByID(Buffer.from(id, 'base64'));
						blocks.push(block);
					}
				} catch (error) {
					if (!(error instanceof NotFoundError)) {
						throw error;
					}
				}
				return blocks.map(block => this._chain.dataAccess.encode(block).toString('base64'));
			},
			getBlockByHeight: async (params: { height: number }): Promise<string | undefined> => {
				try {
					const block = await this._chain.dataAccess.getBlockByHeight(params.height);
					return this._chain.dataAccess.encode(block).toString('base64');
				} catch (error) {
					if (error instanceof NotFoundError) {
						return undefined;
					}
					throw error;
				}
			},
			getBlocksByHeightBetween: async (params: {
				from: number;
				to: number;
			}): Promise<readonly string[]> => {
				const blocks = await this._chain.dataAccess.getBlocksByHeightBetween(
					params.from,
					params.to,
				);

				return blocks.map(b => this._chain.dataAccess.encode(b).toString('base64'));
			},
			getTransactionByID: async (params: { id: string }): Promise<string> => {
				const transaction = await this._chain.dataAccess.getTransactionByID(
					Buffer.from(params.id, 'base64'),
				);

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				return transaction.getBytes().toString('base64');
			},
			getTransactionsByIDs: async (params: { ids: readonly string[] }): Promise<string[]> => {
				const transactions = [];
				try {
					for (const id of params.ids) {
						const transaction = await this._chain.dataAccess.getTransactionByID(
							Buffer.from(id, 'base64'),
						);
						transactions.push(transaction);
					}
				} catch (error) {
					if (!(error instanceof NotFoundError)) {
						throw error;
					}
				}
				return transactions.map(tx => tx.getBytes().toString('base64'));
			},
			getTransactions: async (params: {
				data: unknown;
				peerId: string;
			}): Promise<HandleRPCGetTransactionsReturn> =>
				this._transport.handleRPCGetTransactions(params.data, params.peerId),
			getForgingStatusOfAllDelegates: (): { address: string; forging: boolean }[] | undefined =>
				this._forger.getForgingStatusOfAllDelegates()?.map(({ address, forging }) => ({
					address: address.toString('base64'),
					forging,
				})),
			getTransactionsFromPool: (): string[] =>
				this._transactionPool.getAll().map(tx => tx.getBytes().toString('base64')),
			postTransaction: async (
				params: EventPostTransactionData,
			): Promise<handlePostTransactionReturn> => this._transport.handleEventPostTransaction(params),
			getSlotNumber: (params: { timeStamp: number | undefined }): number =>
				this._chain.slots.getSlotNumber(params.timeStamp),
			calcSlotRound: (params: { height: number }): number =>
				this._dpos.rounds.calcRound(params.height),
			// eslint-disable-next-line @typescript-eslint/require-await
			getLastBlock: async (): Promise<string> =>
				this._chain.dataAccess.encode(this._chain.lastBlock).toString('base64'),
			getBlocksFromId: async (params: { data: unknown; peerId: string }): Promise<string[]> =>
				this._transport.handleRPCGetBlocksFromId(params.data, params.peerId),
			getHighestCommonBlock: async (params: {
				data: unknown;
				peerId: string;
			}): Promise<string | undefined> =>
				this._transport.handleRPCGetGetHighestCommonBlock(params.data, params.peerId),
			getSchema: (): CodecSchema => ({
				account: (this._chain.accountSchema as unknown) as Schema,
				blockSchema,
				blockHeaderSchema,
				blockHeadersAssets: {
					0: BlockProcessorV0.schema,
					2: BlockProcessorV2.schema,
				},
				baseTransaction: BaseTransaction.BASE_SCHEMA,
				transactionsAssets: this._getRegisteredTransactionSchemas(),
			}),
			getNodeInfo: () => ({
				version: this._options.version,
				protocolVersion: this._options.protocolVersion,
				networkID: this._options.networkId,
				lastBlockID: this._chain.lastBlock.header.id.toString('base64'),
				height: this._chain.lastBlock.header.height,
				finalizedHeight: this._bft.finalityManager.finalizedHeight,
				syncing: this._synchronizer.isActive,
				unconfirmedTransactions: this._transactionPool.getAll().length,
				genesisConfig: {
					...this._options.genesisConfig,
					...this._options.constants,
					totalAmount: this._options.constants.totalAmount.toString(),
				},
			}),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async cleanup(): Promise<void> {
		this._transactionPool.stop();
		this._unsubscribeToEvents();
		this._logger.info('Cleaned up successfully');
	}

	private _initModules(): void {
		this._networkIdentifier = getNetworkIdentifier(
			this._options.genesisBlock.header.transactionRoot,
			this._options.communityIdentifier,
		);
		this._chain = new Chain({
			db: this._blockchainDB,
			genesisBlock: this._options.genesisBlock,
			registeredTransactions: this._options.registeredTransactions,
			accountAsset: {
				schema: accountAssetSchema,
				default: defaultAccountAsset,
			},
			registeredBlocks: {
				0: BlockProcessorV0.schema,
				2: BlockProcessorV2.schema,
			},
			networkIdentifier: this._networkIdentifier,
			maxPayloadLength: this._options.constants.maxPayloadLength,
			rewardDistance: this._options.constants.rewards.distance,
			rewardOffset: this._options.constants.rewards.offset,
			rewardMilestones: this._options.constants.rewards.milestones,
			totalAmount: this._options.constants.totalAmount,
			blockTime: this._options.constants.blockTime,
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
		this._chain.events.on(
			EVENT_NEW_BLOCK,
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			async (eventData: {
				block: Block;
				accounts: Account[];
				// eslint-disable-next-line @typescript-eslint/require-await
			}): Promise<void> => {
				const { block } = eventData;
				// Publish to the outside
				this._channel.publish('app:block:new', {
					block: this._chain.dataAccess.encode(block).toString('base64'),
					accounts: eventData.accounts.map(acc =>
						this._chain.dataAccess.encodeAccount(acc).toString('base64'),
					),
				});

				// Remove any transactions from the pool on new block
				if (block.payload.length) {
					for (const transaction of block.payload) {
						this._transactionPool.remove(transaction);
					}
				}

				if (!this._synchronizer.isActive) {
					this._applicationState.update({
						height: block.header.height,
						lastBlockId: block.header.id.toString('base64'),
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
						maxHeightPrevoted: block.header.asset.maxHeightPrevoted,
						blockVersion: block.header.version,
					});
				}

				this._logger.info(
					{
						id: block.header.id,
						height: block.header.height,
						numberOfTransactions: block.payload.length,
					},
					'New block added to the chain',
				);
			},
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
		this._chain.events.on(
			EVENT_DELETE_BLOCK,
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			async (eventData: { block: Block; accounts: Account[] }) => {
				const { block } = eventData;
				// Publish to the outside
				this._channel.publish('app:block:delete', {
					block: this._chain.dataAccess.encode(block).toString('base64'),
					accounts: eventData.accounts.map(acc =>
						this._chain.dataAccess.encodeAccount(acc).toString('base64'),
					),
				});

				if (block.payload.length) {
					for (const transaction of block.payload) {
						try {
							await this._transactionPool.add(transaction);
						} catch (err) {
							this._logger.error(
								{ err: err as Error },
								'Failed to add transaction back to the pool',
							);
						}
					}
				}
				this._logger.info(
					{ id: block.header.id, height: block.header.height },
					'Deleted a block from the chain',
				);
			},
		);

		this._dpos = new Dpos({
			chain: this._chain,
			initDelegates: this._options.genesisBlock.header.asset.initDelegates,
			initRound: this._options.genesisBlock.header.asset.initRounds,
			genesisBlockHeight: this._options.genesisBlock.header.height,
			activeDelegates: this._options.constants.activeDelegates,
			standbyDelegates: this._options.constants.standbyDelegates,
			delegateListRoundOffset: this._options.constants.delegateListRoundOffset,
		});

		this._bft = new BFT({
			dpos: this._dpos,
			chain: this._chain,
			activeDelegates: this._options.constants.activeDelegates,
			genesisHeight: this._options.genesisBlock.header.height,
		});

		this._dpos.events.on(EVENT_ROUND_CHANGED, (data: { newRound: number }) => {
			this._channel.publish('app:round:change', { number: data.newRound });
		});

		this._processor = new Processor({
			channel: this._channel,
			logger: this._logger,
			chainModule: this._chain,
			bftModule: this._bft,
		});

		this._transactionPool = new TransactionPool({
			applyTransactions: this._chain.applyTransactions.bind(this._chain),
		});

		const blockSyncMechanism = new BlockSynchronizationMechanism({
			logger: this._logger,
			bft: this._bft,
			dpos: this._dpos,
			channel: this._channel,
			chain: this._chain,
			processorModule: this._processor,
			networkModule: this._networkModule,
		});

		const fastChainSwitchMechanism = new FastChainSwitchingMechanism({
			logger: this._logger,
			channel: this._channel,
			chain: this._chain,
			bft: this._bft,
			dpos: this._dpos,
			processor: this._processor,
			networkModule: this._networkModule,
		});

		this._synchronizer = new Synchronizer({
			channel: this._channel,
			logger: this._logger,
			chainModule: this._chain,
			processorModule: this._processor,
			transactionPoolModule: this._transactionPool,
			mechanisms: [blockSyncMechanism, fastChainSwitchMechanism],
			networkModule: this._networkModule,
		});

		blockSyncMechanism.events.on(EVENT_SYNCHRONIZER_SYNC_REQUIRED, ({ block, peerId }) => {
			this._synchronizer.run(block, peerId).catch(err => {
				this._logger.error(
					{ err: err as Error },
					'Error occurred during block synchronization mechanism.',
				);
			});
		});

		fastChainSwitchMechanism.events.on(EVENT_SYNCHRONIZER_SYNC_REQUIRED, ({ block, peerId }) => {
			this._synchronizer.run(block, peerId).catch(err => {
				this._logger.error(
					{ err: err as Error },
					'Error occurred during fast chain synchronization mechanism.',
				);
			});
		});

		this._forger = new Forger({
			logger: this._logger,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			db: this._forgerDB,
			dposModule: this._dpos,
			bftModule: this._bft,
			transactionPoolModule: this._transactionPool,
			processorModule: this._processor,
			chainModule: this._chain,
			forgingDelegates: this._options.forging.delegates,
			forgingForce: this._options.forging.force,
			forgingDefaultPassword: this._options.forging.defaultPassword,
			forgingWaitThreshold: this._options.forging.waitThreshold,
			maxPayloadLength: this._options.constants.maxPayloadLength,
		});

		this._transport = new Transport({
			channel: this._channel,
			logger: this._logger,
			synchronizer: this._synchronizer,
			transactionPoolModule: this._transactionPool,
			processorModule: this._processor,
			chainModule: this._chain,
			networkModule: this._networkModule,
		});
	}

	private async _startLoader(): Promise<void> {
		return this._synchronizer.loadUnconfirmedTransactions();
	}

	private async _forgingTask(): Promise<void> {
		return this._sequence.add(async () => {
			try {
				if (!this._forger.delegatesEnabled()) {
					this._logger.trace('No delegates are enabled');
					return;
				}
				if (this._synchronizer.isActive) {
					this._logger.debug('Client not ready to forge');
					return;
				}
				await this._forger.forge();
			} catch (err) {
				this._logger.error({ err: err as Error });
			}
		});
	}

	private async _startForging(): Promise<void> {
		try {
			await this._forger.loadDelegates();
		} catch (err) {
			this._logger.error({ err: err as Error }, 'Failed to load delegates for forging');
		}
		this._forgingJob = new Job(async () => this._forgingTask(), forgeInterval);
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this._forgingJob.start();
	}

	private _subscribeToEvents(): void {
		// FIXME: this event is using instance, it should be replaced by event emitter
		this._processor.events.on(
			EVENT_PROCESSOR_BROADCAST_BLOCK,
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			async ({ block }) => {
				await this._transport.handleBroadcastBlock(block);
			},
		);

		this._processor.events.on(EVENT_PROCESSOR_SYNC_REQUIRED, ({ block, peerId }) => {
			this._synchronizer.run(block, peerId).catch(err => {
				this._logger.error({ err: err as Error }, 'Error occurred during synchronization.');
			});
		});

		this._transactionPool.events.on(EVENT_TRANSACTION_REMOVED, event => {
			this._logger.debug(event, 'Transaction was removed from the pool.');
		});
	}

	private _unsubscribeToEvents(): void {
		this._bft.removeAllListeners(EVENT_BFT_BLOCK_FINALIZED);
	}
	private _getRegisteredTransactionSchemas(): RegisteredSchemas {
		const registredTransactions: RegisteredSchemas = {};

		for (const aTransactionSchema of Object.entries(this._options.registeredTransactions)) {
			registredTransactions[aTransactionSchema[0]] = aTransactionSchema[1].ASSET_SCHEMA as Schema;
		}
		return registredTransactions;
	}
}
