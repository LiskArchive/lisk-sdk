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

import { ForkStatus, BFT } from '@liskhq/lisk-bft';
import { Chain, Block, BlockHeader } from '@liskhq/lisk-chain';
import { objects, jobHandlers } from '@liskhq/lisk-utils';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { EventEmitter } from 'events';
import { Logger } from '../../logger';
import { BaseBlockProcessor } from './base_block_processor';
import { InMemoryChannel } from '../../../controller/channels';

const forkStatusList = [
	ForkStatus.IDENTICAL_BLOCK,
	ForkStatus.VALID_BLOCK,
	ForkStatus.DOUBLE_FORGING,
	ForkStatus.TIE_BREAK,
	ForkStatus.DIFFERENT_CHAIN,
	ForkStatus.DISCARD,
];

export const EVENT_PROCESSOR_SYNC_REQUIRED = 'EVENT_PROCESSOR_SYNC_REQUIRED';
export const EVENT_PROCESSOR_BROADCAST_BLOCK = 'EVENT_PROCESSOR_BROADCAST_BLOCK';

interface ProcessorInput {
	readonly channel: InMemoryChannel;
	readonly logger: Logger;
	readonly chainModule: Chain;
	readonly bftModule: BFT;
}

interface CreateInput {
	readonly keypair: { publicKey: Buffer; privateKey: Buffer };
	readonly timestamp: number;
	readonly transactions: BaseTransaction[];
	readonly previousBlock: Block;
	readonly seedReveal: Buffer;
}

type Matcher = (block: BlockHeader) => boolean;

export class Processor {
	public readonly events: EventEmitter;
	private readonly _channel: InMemoryChannel;
	private readonly _logger: Logger;
	private readonly _chain: Chain;
	private readonly _bft: BFT;
	private readonly _jobQueue: jobHandlers.JobQueue;
	private readonly _processors: { [key: string]: BaseBlockProcessor };
	private readonly _matchers: { [key: string]: Matcher };
	private _stop = false;

	public constructor({ channel, logger, chainModule, bftModule }: ProcessorInput) {
		this._channel = channel;
		this._logger = logger;
		this._chain = chainModule;
		this._bft = bftModule;
		this._jobQueue = new jobHandlers.JobQueue();
		this._processors = {};
		this._matchers = {};
		this.events = new EventEmitter();
	}

	// register a block processor with particular version
	public register(processor: BaseBlockProcessor, { matcher }: { matcher?: Matcher } = {}): void {
		if (typeof processor.version !== 'number') {
			throw new Error('version property must exist for processor');
		}
		this._processors[processor.version] = processor;
		this._matchers[processor.version] = matcher ?? ((): boolean => true);
	}

	public async init(): Promise<void> {
		const { genesisBlock } = this._chain;
		this._logger.debug(
			{
				id: genesisBlock.header.id,
				transactionRoot: genesisBlock.header.transactionRoot,
			},
			'Initializing processor',
		);
		// do init check for block state. We need to load the blockchain
		const stateStore = await this._chain.newStateStore();
		await this._bft.init(stateStore);
		const genesisBlockExists = await this._chain.exists(genesisBlock);
		if (!genesisBlockExists) {
			await this.processValidated(genesisBlock, { removeFromTempTable: true });
		}
		await this._chain.init();
		this._logger.info('Blockchain ready');
	}

	public async stop(): Promise<void> {
		this._stop = true;
		await this._jobQueue.stop();
	}

	// process is for standard processing of block, especially when received from network
	public async process(block: Block, { peerId }: { peerId?: string } = {}): Promise<void> {
		if (this._stop) {
			return;
		}
		await this._jobQueue.add(async () => {
			this._logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Starting to process block',
			);
			const blockProcessor = this._getBlockProcessor(block);
			const { lastBlock } = this._chain;
			const stateStore = await this._chain.newStateStore();

			const forkStatus = await blockProcessor.forkStatus.run({
				block,
				lastBlock,
			});

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
				const encodedBlock = this._chain.dataAccess.encode(block);
				this._channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
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
						generatorPublicKey: block.header.generatorPublicKey,
					},
					'Discarding block due to double forging',
				);
				const encodedBlock = this._chain.dataAccess.encode(block);
				this._channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
				return;
			}
			// Discard block and move to different chain
			if (forkStatus === ForkStatus.DIFFERENT_CHAIN) {
				this._logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Detected different chain to sync',
				);
				const encodedBlock = this._chain.dataAccess.encode(block);
				// Sync requires decoded block
				this.events.emit(EVENT_PROCESSOR_SYNC_REQUIRED, {
					block,
					peerId,
				});
				this._channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
				return;
			}
			// Replacing a block
			if (forkStatus === ForkStatus.TIE_BREAK) {
				this._logger.info(
					{ id: lastBlock.header.id, height: lastBlock.header.height },
					'Received tie breaking block',
				);
				const encodedBlock = this._chain.dataAccess.encode(block);
				this._channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});

				await blockProcessor.validate.run({
					block,
					lastBlock,
					stateStore,
				});
				const previousLastBlock = objects.cloneDeep(lastBlock);
				await this._deleteBlock(lastBlock);
				const newLastBlock = this._chain.lastBlock;
				try {
					await this._processValidated(block, newLastBlock, blockProcessor);
				} catch (err) {
					this._logger.error(
						{
							id: block.header.id,
							previousBlockId: previousLastBlock.header.id,
							err: err as Error,
						},
						'Failed to apply newly received block. restoring previous block.',
					);
					await this._processValidated(previousLastBlock, newLastBlock, blockProcessor, {
						skipBroadcast: true,
					});
				}
				return;
			}

			this._logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Processing valid block',
			);
			await blockProcessor.validate.run({
				block,
				lastBlock,
				stateStore,
			});
			await this._processValidated(block, lastBlock, blockProcessor);
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async forkStatus(receivedBlock: Block, lastBlock?: Block): Promise<number> {
		const blockProcessor = this._getBlockProcessor(receivedBlock);

		return blockProcessor.forkStatus.run({
			block: receivedBlock,
			lastBlock: lastBlock ?? this._chain.lastBlock,
		});
	}

	public async create(data: CreateInput): Promise<Block> {
		const { previousBlock } = data;
		this._logger.trace(
			{
				previousBlockId: previousBlock.header.id,
				previousBlockHeight: previousBlock.header.height,
			},
			'Creating block',
		);
		const highestVersion = Math.max.apply(
			null,
			Object.keys(this._processors).map(v => parseInt(v, 10)),
		);
		const processor = this._processors[highestVersion];
		const stateStore = await this._chain.newStateStore();

		return processor.create.run({ data, stateStore });
	}

	public async validate(block: Block): Promise<void> {
		this._logger.debug({ id: block.header.id, height: block.header.height }, 'Validating block');
		const blockProcessor = this._getBlockProcessor(block);
		await blockProcessor.validate.run({
			block,
		});
	}

	// processValidated processes a block assuming that statically it's valid
	public async processValidated(
		block: Block,
		{ removeFromTempTable = false }: { removeFromTempTable?: boolean } = {},
	): Promise<void> {
		if (this._stop) {
			return;
		}
		await this._jobQueue.add(async () => {
			this._logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Processing validated block',
			);
			const { lastBlock } = this._chain;
			const blockProcessor = this._getBlockProcessor(block);
			return this._processValidated(block, lastBlock, blockProcessor, {
				skipBroadcast: true,
				removeFromTempTable,
			});
		});
	}

	public async deleteLastBlock({
		saveTempBlock = false,
	}: { saveTempBlock?: boolean } = {}): Promise<void> {
		if (this._stop) {
			return;
		}
		await this._jobQueue.add(async () => {
			const { lastBlock } = this._chain;
			this._logger.debug(
				{ id: lastBlock.header.id, height: lastBlock.header.height },
				'Deleting last block',
			);
			await this._deleteBlock(lastBlock, saveTempBlock);
			return this._chain.lastBlock;
		});
	}

	private async _processValidated(
		block: Block,
		lastBlock: Block,
		processor: BaseBlockProcessor,
		{
			skipBroadcast,
			removeFromTempTable = false,
		}: {
			skipBroadcast?: boolean;
			removeFromTempTable?: boolean;
		} = {},
	): Promise<Block> {
		const stateStore = await this._chain.newStateStore();
		await processor.verify.run({
			block,
			lastBlock,
			stateStore,
		});

		if (!skipBroadcast) {
			// FIXME: this is using instance, use event emitter instead
			this.events.emit(EVENT_PROCESSOR_BROADCAST_BLOCK, {
				block,
			});
		}

		// Apply should always be executed after save as it performs database calculations
		// i.e. Dpos.apply expects to have this processing block in the database
		await processor.apply.run({
			block,
			lastBlock,
			stateStore,
		});

		await this._chain.save(block, stateStore, this._bft.finalizedHeight, {
			removeFromTempTable,
		});

		return block;
	}

	private async _deleteBlock(block: Block, saveTempBlock = false): Promise<void> {
		if (block.header.height <= this._bft.finalizedHeight) {
			throw new Error('Can not delete block below or same as finalized height');
		}

		// Offset must be set to 1, because lastBlock is still this deleting block
		const stateStore = await this._chain.newStateStore(1);
		await this._chain.remove(block, stateStore, { saveTempBlock });
	}

	private _getBlockProcessor(block: Block): BaseBlockProcessor {
		const { version } = block.header;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!this._processors[version]) {
			throw new Error('Block processing version is not registered');
		}
		// Sort in asc order
		const matcherVersions = Object.keys(this._matchers).sort((a, b) => a.localeCompare(b, 'en'));
		// eslint-disable-next-line no-restricted-syntax
		for (const matcherVersion of matcherVersions) {
			const matcher = this._matchers[matcherVersion];
			if (matcher(block.header)) {
				return this._processors[matcherVersion];
			}
		}
		throw new Error('No matching block processor found');
	}
}
