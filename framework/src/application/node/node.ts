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

import {
	Chain,
	events as chainEvents,
	BlockInstance,
	BlockJSON,
	Account,
	AccountJSON,
} from '@liskhq/lisk-chain';
import {
	Dpos,
	constants as dposConstants,
} from '@liskhq/lisk-dpos';
import { EVENT_BFT_BLOCK_FINALIZED, BFT } from '@liskhq/lisk-bft';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import {
	TransactionPool,
	Job,
	events as tPoolEvents,
} from '@liskhq/lisk-transaction-pool';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { convertErrorsToString } from './utils/error_handlers';
import { Sequence } from './utils/sequence';
import { Forger } from './forger';
import { Transport } from './transport';
import {
	Synchronizer,
	BlockSynchronizationMechanism,
	FastChainSwitchingMechanism,
} from './synchronizer';
import { Processor } from './processor';
import { Rebuilder } from './rebuilder';
import { BlockProcessorV2 } from './block_processor_v2';
import { Channel, Logger, ApplicationState } from '../../types';
import { ForgingStatus } from './forger/forger';

const forgeInterval = 1000;
const { EVENT_NEW_BLOCK, EVENT_DELETE_BLOCK } = chainEvents;
const { EVENT_ROUND_CHANGED } = dposConstants;
const { EVENT_TRANSACTION_REMOVED } = tPoolEvents;

interface GenesisBlockInstance extends BlockInstance {
	readonly communityIdentifier?: string;
}

interface Options {
	readonly forging: {
		readonly waitThreshold: number;
	};
	readonly constants: {
		readonly maxPayloadLength: number;
		readonly reward: {
			readonly rewardDistance: number
			readonly rewardOffset: number;
			readonly rewardMilestones: number;
		};
		readonly totalAmount: bigint;
		readonly epochTime: number;
		readonly blockTime: number;
	};
	readonly registeredTransactions: BaseTransaction[];
	genesisBlock: GenesisBlockInstance;
	readonly rebuildUpToRound: string;
}

interface NodeConstructor {
	readonly channel: Channel;
	readonly options: Options;
	readonly logger: Logger;
	readonly storage: Storage;
	readonly applicationState: ApplicationState;
}

interface P2PMessagePacket {
	readonly peerId: string;
	readonly data: unknown;
	readonly event: string;
}

export class Node {
	private readonly _channel: Channel;
	private readonly _options: Options;
	private readonly _logger: Logger;
	private readonly _storage: Storage;
	private readonly _applicationState: ApplicationState;
	private readonly _components: { readonly logger: Logger };
	private _sequence!: Sequence;
	private _networkIdentifier!: string;
	private readonly _chain!: Chain;
	private readonly _bft!: BFT;
	private readonly _dpos!: Dpos;
	private readonly _processor!: Processor;
	private readonly _synchronizer!: Synchronizer;
	private readonly _rebuilder!: Rebuilder;
	private readonly _transactionPool!: TransactionPool;
	private readonly _transport!: Transport;
	private readonly _forger!: Forger;
	private readonly _modules!: {};
	private readonly _forgingJob!: Job<any>;

	public constructor({ channel, options, logger, storage, applicationState }: NodeConstructor) {
		this._channel = channel;
		this._options = options;
		this._logger = logger;
		this._storage = storage;
		this._applicationState = applicationState;
		this._components = { logger: this._logger };
	}

	public async bootstrap(): Promise<void> {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!this._options.genesisBlock) {
				throw Error('Missing genesis block');
			}

			if (
				this._options.forging.waitThreshold >= this._options.constants.blockTime
			) {
				throw Error(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					`forging.waitThreshold=${this._options.forging.waitThreshold} is greater or equal to genesisConfig.blockTime=${this._options.constants.blockTime}. It impacts the forging and propagation of blocks. Please use a smaller value for forging.waitThreshold`,
				);
			}

			this._networkIdentifier = getNetworkIdentifier(
				this._options.genesisBlock.payloadHash,
				this._options.genesisBlock.communityIdentifier,
			);

			this._sequence = new Sequence({
				onWarning(current) {
					this._components.logger.warn('Main queue', current);
				},
			});

			this._initModules();

			// Prepare dependency
			const processorDependencies = {
				networkIdentifier: this._networkIdentifier,
				chainModule: this._chain,
				bftModule: this._bft,
				dposModule: this._dpos,
				logger: this._logger,
				constants: this._options.constants,
				storage: this._storage,
			};

			this._processor.register(new BlockProcessorV2(processorDependencies));

			// Deserialize genesis block and overwrite the options
			this._options.genesisBlock = await this._processor.deserialize(
				this._options.genesisBlock as unknown as BlockJSON,
			);

			this._channel.subscribe('app:state:updated', (event: { readonly data: ApplicationState }) => {
				Object.assign(this._applicationState, event.data);
			});

			this._logger.info('Modules ready and launched');
			// After binding, it should immediately load blockchain
			await this._processor.init(this._options.genesisBlock);
			// Check if blocks are left in temp_blocks table
			await this._synchronizer.init();

			// Update Application State after processor is initialized
			await this._channel.invoke('app:updateApplicationState', {
				height: this._chain.lastBlock.height,
				lastBlockId: this._chain.lastBlock.id,
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				maxHeightPrevoted: this._chain.lastBlock.maxHeightPrevoted || 0,
				blockVersion: this._chain.lastBlock.version,
			});

			// Deactivate broadcast and syncing during snapshotting process
			if (!Number.isNaN(parseInt(this._options.rebuildUpToRound, 10))) {
				await this._rebuilder.rebuild(this._options.rebuildUpToRound);
				this._logger.info(
					{
						rebuildUpToRound: this._options.rebuildUpToRound,
					},
					'Successfully rebuild the blockchain',
				);
				process.exit(0);
				return;
			}

			this._subscribeToEvents();

			this._channel.subscribe('app:network:ready', async () => {
				await this._startLoader();
			});

			this._channel.subscribe('app:ready', async () => {
				await this._transactionPool.start();
				await this._startForging();
			});

			// Avoid receiving blocks/transactions from the network during snapshotting process
			if (!this._options.rebuildUpToRound) {
				this._channel.subscribe(
					'app:network:event',
					async ({ data: { event, data, peerId } }: { readonly data: P2PMessagePacket }) => {
						try {
							if (event === 'postTransactionsAnnouncement') {
								await this._transport.handleEventPostTransactionsAnnouncement(
									data,
									peerId,
								);
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
			}
		} catch (error) {
			this._logger.fatal(
				{
					message: (error as Error).message,
					stack: (error as Error).stack,
				},
				'Failed to initialization node',
			);
			process.exit(0);
		}
	}

	public get actions() {
		return {
			calculateSupply: (action: { params: { height: number; }; }): bigint =>
				this._chain.blockReward.calculateSupply(action.params.height),
			calculateMilestone: (action: { params: { height: number; }; }): number =>
				this._chain.blockReward.calculateMilestone(action.params.height),
			calculateReward: (action: { params: { height: number; }; }): bigint =>
				this._chain.blockReward.calculateReward(action.params.height),
			getForgerAddressesForRound: async (action: { params: { round: number; }; }): Promise<readonly string[]> =>
				this._dpos.getForgerAddressesForRound(action.params.round),
			updateForgingStatus: async (action: { params: { publicKey: string; password: string; forging: boolean; }; }): Promise<ForgingStatus> =>
				this._forger.updateForgingStatus(
					action.params.publicKey,
					action.params.password,
					action.params.forging,
				),
			getAccount: async (action: { params: { address: string; }; }): Promise<AccountJSON> => {
				const account = await this._chain.dataAccess.getAccountByAddress(
					action.params.address,
				);
				return account.toJSON();
			},
			getAccounts: async (action: { params: { address: readonly string[]; }; }): Promise<readonly AccountJSON[]> => {
				const accounts = await this._chain.dataAccess.getAccountsByAddress(
					action.params.address,
				);
				return accounts.map(account => account.toJSON());
			},
			getBlockByID: async (action: { params: { id: string; }; }): Promise<BlockJSON | undefined> => {
				const block = await this._chain.dataAccess.getBlockByID(
					action.params.id,
				);

				return block ? this._chain.dataAccess.serialize(block) : undefined;
			},
			getBlocksByIDs: async (action: { params: { ids: readonly string[]; }; }): Promise<readonly BlockJSON[] | undefined> => {
				const blocks = await this._chain.dataAccess.getBlocksByIDs(
					action.params.ids,
				);

				return blocks.length > 0
					? blocks.map(b => this._chain.dataAccess.serialize(b))
					: [];
			},
			getBlockByHeight: async (action: { params: { height: number; }; }): Promise<BlockJSON | undefined> => {
				const block = await this._chain.dataAccess.getBlockByHeight(
					action.params.height,
				);

				return block ? this._chain.dataAccess.serialize(block) : undefined;
			},
			getBlocksByHeightBetween: async (action: { params: { heights: number; }; }): Promise<readonly BlockJSON[] | undefined> => {
				const blocks = await this._chain.dataAccess.getBlocksByHeightBetween(
					action.params.heights,
				);

				return blocks.length > 0
					? blocks.map((b: BlockJSON) => this._chain.dataAccess.deserialize(b))
					: [];
			},
			getTransactionByID: async (action: { params: { id: readonly string[]; }; }) => {
				const [transaction] = await this._chain.dataAccess.getTransactionsByIDs(
					action.params.id,
				);

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				return transaction
					? this._chain.dataAccess.deserializeTransaction(transaction)
					: undefined;
			},
			getTransactionsByIDs: async (action: { params: { ids: readonly string[]; }; }) => {
				const transactions = await this._chain.dataAccess.getTransactionsByIDs(
					action.params.ids,
				);

				return transactions.length > 0
					? transactions.map(tx =>
						this._chain.dataAccess.deserializeTransaction(tx),
					)
					: [];
			},
			getTransactions: async (action: { params: { data: unknown; peerId: string; }; }) =>
				this._transport.handleRPCGetTransactions(
					action.params.data,
					action.params.peerId,
				),
			getForgingStatusOfAllDelegates: () =>
				this._forger.getForgingStatusOfAllDelegates(),
			getTransactionsFromPool: () =>
				this._transactionPool.getAll().map(tx => tx.toJSON()),
			postTransaction: async (action: { params: import("../../../../../../../../../Users/manu/lisk_ecosystem/sdk-core-lips/lisk-sdk/framework/src/types").EventPostTransactionData; }) =>
				this._transport.handleEventPostTransaction(action.params),
			getSlotNumber: (action: { params: { epochTime: number | undefined; }; }) =>
				action.params
					? this._chain.slots.getSlotNumber(action.params.epochTime)
					: this._chain.slots.getSlotNumber(),
			calcSlotRound: (action: { params: { height: number; }; }) => this._dpos.rounds.calcRound(action.params.height),
			getNodeStatus: () => ({
				syncing: this._synchronizer.isActive,
				unconfirmedTransactions: this._transactionPool.getAll().length,
				secondsSinceEpoch: this._chain.slots.getEpochTime(),
				lastBlock: this._chain.lastBlock,
				chainMaxHeightFinalized: this._bft.finalityManager.finalizedHeight,
			}),
			getLastBlock: async () => this._processor.serialize(this._chain.lastBlock),
			getBlocksFromId: async (action: { params: { data: unknown; peerId: string; }; }) =>
				this._transport.handleRPCGetBlocksFromId(
					action.params.data,
					action.params.peerId,
				),
			getHighestCommonBlock: async (action: { params: { data: unknown; peerId: string; }; }) =>
				this._transport.handleRPCGetGetHighestCommonBlock(
					action.params.data,
					action.params.peerId,
				),
		};
	}

	public async cleanup(error: { toString: () => unknown; }) {
		this._transactionPool.stop();
		this._unsubscribeToEvents();
		const { modules } = this;

		if (error) {
			this._logger.fatal(error.toString());
		}
		this._logger.info('Cleaning chain...');

		// Run cleanup operation on each module before shutting down the node;
		// this includes operations like the rebuild verification process.
		await Promise.all(
			Object.keys(modules).map(key => {
				if (typeof modules[key].cleanup === 'function') {
					return modules[key].cleanup();
				}
				return true;
			}),
		).catch(moduleCleanupError => {
			this._logger.error(convertErrorsToString(moduleCleanupError));
		});

		this._logger.info('Cleaned up successfully');
	}

	private _initModules(): void {
		this._modules = {};

		this._chain = new Chain({
			logger: this._logger,
			storage: this._storage,
			genesisBlock: this._options.genesisBlock,
			registeredTransactions: this._options.registeredTransactions,
			networkIdentifier: this._networkIdentifier,
			maxPayloadLength: this._options.constants.maxPayloadLength,
			rewardDistance: this._options.constants.reward.distance,
			rewardOffset: this._options.constants.reward.offset,
			rewardMilestones: this._options.constants.reward.milestones,
			totalAmount: this._options.constants.totalAmount,
			epochTime: this._options.constants.epochTime,
			blockTime: this._options.constants.blockTime,
		});

		this._chain.events.on(EVENT_NEW_BLOCK, (eventData: object | undefined) => {
			const { block } = eventData;
			// Publish to the outside
			this._channel.publish('app:block:new', eventData);

			// Remove any transactions from the pool on new block
			if (block.transactions.length) {
				for (const transaction of block.transactions) {
					this._transactionPool.remove(
						this._chain.deserializeTransaction(transaction),
					);
				}
			}

			if (!this._synchronizer.isActive && !this._rebuilder.isActive) {
				this._channel.invoke('app:updateApplicationState', {
					height: block.height,
					lastBlockId: block.id,
					maxHeightPrevoted: block.maxHeightPrevoted,
					blockVersion: block.version,
				});
			}

			this._logger.info(
				{
					id: block.id,
					height: block.height,
					numberOfTransactions: block.transactions.length,
				},
				'New block added to the chain',
			);
		});

		this._chain.events.on(EVENT_DELETE_BLOCK, async (eventData: object | undefined) => {
			const { block } = eventData;
			// Publish to the outside
			this._channel.publish('app:block:delete', eventData);

			if (block.transactions.length) {
				for (const transaction of block.transactions) {
					try {
						await this._transactionPool.add(
							this._chain.deserializeTransaction(transaction),
						);
					} catch (err) {
						this._logger.error(
							{ err },
							'Failed to add transaction back to the pool',
						);
					}
				}
			}
			this._logger.info(
				{ id: block.id, height: block.height },
				'Deleted a block from the chain',
			);
		});

		this._dpos = new Dpos({
			chain: this._chain,
			activeDelegates: this._options.constants.activeDelegates,
			standbyDelegates: this._options.constants.standbyDelegates,
			delegateListRoundOffset: this._options.constants.delegateListRoundOffset,
		});

		this._bft = new BFT({
			dpos: this._dpos,
			chain: this._chain,
			activeDelegates: this._options.constants.activeDelegates,
			startingHeight: 0, // TODO: Pass exception precedent from config or height for block version 2
		});

		this._dpos.events.on(EVENT_ROUND_CHANGED, data => {
			this._channel.publish('app:round:change', { number: data.newRound });
		});

		this._processor = new Processor({
			channel: this._channel,
			logger: this._logger,
			storage: this._storage,
			chainModule: this._chain,
		});

		this._transactionPool = new TransactionPool({
			applyTransactions: this._chain.applyTransactions.bind(this._chain),
		});
		this._modules.transactionPool = this._transactionPool;

		const blockSyncMechanism = new BlockSynchronizationMechanism({
			storage: this._storage,
			logger: this._logger,
			bft: this._bft,
			dpos: this._dpos,
			channel: this._channel,
			chain: this._chain,
			processorModule: this._processor,
		});

		const fastChainSwitchMechanism = new FastChainSwitchingMechanism({
			logger: this._logger,
			channel: this._channel,
			chain: this._chain,
			bft: this._bft,
			dpos: this._dpos,
			processor: this._processor,
		});

		this._synchronizer = new Synchronizer({
			channel: this._channel,
			logger: this._logger,
			chainModule: this._chain,
			processorModule: this._processor,
			transactionPoolModule: this._transactionPool,
			mechanisms: [blockSyncMechanism, fastChainSwitchMechanism],
		});

		this._modules.chain = this._chain;
		this._rebuilder = new Rebuilder({
			channel: this._channel,
			logger: this._logger,
			genesisBlock: this._options.genesisBlock,
			chainModule: this._chain,
			processorModule: this._processor,
			bftModule: this._bft,
			dposModule: this._dpos,
		});
		this._modules.rebuilder = this._rebuilder;

		this._forger = new Forger({
			channel: this._channel,
			logger: this._logger,
			storage: this._storage,
			dposModule: this._dpos,
			bftModule: this._bft,
			transactionPoolModule: this._transactionPool,
			processorModule: this._processor,
			chainModule: this._chain,
			forgingDelegates: this._options.forging.delegates,
			forgingForce: this._options.forging.force,
			forgingDefaultPassword: this._options.forging.defaultPassword,
			waitThreshold: this._options.forging.waitThreshold,
		});
		this._transport = new Transport({
			channel: this._channel,
			logger: this._logger,
			synchronizer: this._synchronizer,
			applicationState: this._applicationState,
			transactionPoolModule: this._transactionPool,
			processorModule: this._processor,
			chainModule: this._chain,
		});

		this._modules.forger = this._forger;
		this._modules.transport = this._transport;
		this._modules.bft = this._bft;
		this._modules.synchronizer = this._synchronizer;
	}

	private async _startLoader() {
		return this._synchronizer.loadUnconfirmedTransactions();
	}

	private async _forgingTask() {
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
				this._logger.error({ err });
			}
		});
	}

	private async _startForging(): Promise<void> {
		try {
			await this._forger.loadDelegates();
		} catch (err) {
			this._logger.error({ err }, 'Failed to load delegates for forging');
		}
		this._forgingJob = new Job(async () => this._forgingTask(), forgeInterval);
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this._forgingJob.start();
	}

	private _subscribeToEvents(): void {
		this._channel.subscribe(
			'app:block:broadcast',
			async ({ data: { block } }) => {
				await this._transport.handleBroadcastBlock(block);
			},
		);

		this._channel.subscribe('app:chain:sync', ({ data: { block, peerId } }) => {
			this._synchronizer.run(block, peerId).catch(err => {
				this._logger.error({ err }, 'Error occurred during synchronization.');
			});
		});

		this._transactionPool.events.on(EVENT_TRANSACTION_REMOVED, event => {
			this._logger.debug(event, 'Transaction was removed from the pool.');
		});
	}

	private _unsubscribeToEvents(): void {
		this._bft.removeAllListeners(EVENT_BFT_BLOCK_FINALIZED);
	}
};
