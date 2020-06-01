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

import { cloneDeep } from 'lodash';
import { ForkStatus } from '@liskhq/lisk-bft';
import { Chain, Block, BlockHeader } from '@liskhq/lisk-chain';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { EventEmitter } from 'events';
import { Sequence } from '../utils/sequence';
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
export const EVENT_PROCESSOR_BRADCASRT_BLOCK =
	'EVENT_PROCESSOR_BRADCASRT_BLOCK';

interface ProcessorInput {
	readonly channel: InMemoryChannel;
	readonly logger: Logger;
	readonly chainModule: Chain;
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
	private readonly channel: InMemoryChannel;
	private readonly logger: Logger;
	private readonly chainModule: Chain;
	private readonly sequence: Sequence;
	private readonly processors: { [key: string]: BaseBlockProcessor };
	private readonly matchers: { [key: string]: Matcher };

	public constructor({ channel, logger, chainModule }: ProcessorInput) {
		this.channel = channel;
		this.logger = logger;
		this.chainModule = chainModule;
		this.sequence = new Sequence();
		this.processors = {};
		this.matchers = {};
		this.events = new EventEmitter();
	}

	// register a block processor with particular version
	public register(
		processor: BaseBlockProcessor,
		{ matcher }: { matcher?: Matcher } = {},
	): void {
		if (typeof processor.version !== 'number') {
			throw new Error('version property must exist for processor');
		}
		this.processors[processor.version] = processor;
		this.matchers[processor.version] = matcher ?? ((): boolean => true);
	}

	public async init(): Promise<void> {
		const { genesisBlock } = this.chainModule;
		this.logger.debug(
			{
				id: genesisBlock.header.id,
				transactionRoot: genesisBlock.header.transactionRoot,
			},
			'Initializing processor',
		);
		// do init check for block state. We need to load the blockchain
		const blockProcessor = this._getBlockProcessor(genesisBlock);
		await this._processGenesis(genesisBlock, blockProcessor);
		await this.chainModule.init();
		const stateStore = await this.chainModule.newStateStore();
		for (const processor of Object.values(this.processors)) {
			await processor.init.run({ stateStore });
		}
		this.logger.info('Blockchain ready');
	}

	// process is for standard processing of block, especially when received from network
	public async process(
		block: Block,
		{ peerId }: { peerId?: string } = {},
	): Promise<void> {
		return this.sequence.add(async () => {
			this.logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Starting to process block',
			);
			const blockProcessor = this._getBlockProcessor(block);
			const { lastBlock } = this.chainModule;
			const stateStore = await this.chainModule.newStateStore();

			const forkStatus = await blockProcessor.forkStatus.run({
				block,
				lastBlock,
			});

			if (!forkStatusList.includes(forkStatus)) {
				this.logger.debug(
					{ status: forkStatus, blockId: block.header.id },
					'Unknown fork status',
				);
				throw new Error('Unknown fork status');
			}

			// Discarding block
			if (forkStatus === ForkStatus.DISCARD) {
				this.logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Discarding block',
				);
				const encodedBlock = this.chainModule.dataAccess.encode(block);
				this.channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
				return;
			}
			if (forkStatus === ForkStatus.IDENTICAL_BLOCK) {
				this.logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Block already processed',
				);
				return;
			}
			if (forkStatus === ForkStatus.DOUBLE_FORGING) {
				this.logger.warn(
					{
						id: block.header.id,
						generatorPublicKey: block.header.generatorPublicKey,
					},
					'Discarding block due to double forging',
				);
				const encodedBlock = this.chainModule.dataAccess.encode(block);
				this.channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
				return;
			}
			// Discard block and move to different chain
			if (forkStatus === ForkStatus.DIFFERENT_CHAIN) {
				this.logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Detected different chain to sync',
				);
				const encodedBlock = this.chainModule.dataAccess.encode(block);
				// Sync requires decoded block
				this.events.emit(EVENT_PROCESSOR_SYNC_REQUIRED, {
					block,
					peerId,
				});
				this.channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
				return;
			}
			// Replacing a block
			if (forkStatus === ForkStatus.TIE_BREAK) {
				this.logger.info(
					{ id: lastBlock.header.id, height: lastBlock.header.height },
					'Received tie breaking block',
				);
				const encodedBlock = this.chainModule.dataAccess.encode(block);
				this.channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});

				await blockProcessor.validate.run({
					block,
					lastBlock,
					stateStore,
				});
				const previousLastBlock = cloneDeep(lastBlock);
				await this._deleteBlock(lastBlock, blockProcessor);
				const newLastBlock = this.chainModule.lastBlock;
				try {
					await this._processValidated(block, newLastBlock, blockProcessor);
				} catch (err) {
					this.logger.error(
						{
							id: block.header.id,
							previousBlockId: previousLastBlock.header.id,
							err: err as Error,
						},
						'Failed to apply newly received block. restoring previous block.',
					);
					await this._processValidated(
						previousLastBlock,
						newLastBlock,
						blockProcessor,
						{ skipBroadcast: true },
					);
				}
				return;
			}

			this.logger.debug(
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
	public async forkStatus(
		receivedBlock: Block,
		lastBlock?: Block,
	): Promise<number> {
		const blockProcessor = this._getBlockProcessor(receivedBlock);

		return blockProcessor.forkStatus.run({
			block: receivedBlock,
			lastBlock: lastBlock ?? this.chainModule.lastBlock,
		});
	}

	public async create(data: CreateInput): Promise<Block> {
		const { previousBlock } = data;
		this.logger.trace(
			{
				previousBlockId: previousBlock.header.id,
				previousBlockHeight: previousBlock.header.height,
			},
			'Creating block',
		);
		const highestVersion = Math.max.apply(
			null,
			Object.keys(this.processors).map(v => parseInt(v, 10)),
		);
		const processor = this.processors[highestVersion];
		const stateStore = await this.chainModule.newStateStore();

		return processor.create.run({ data, stateStore });
	}

	public async validate(block: Block): Promise<void> {
		this.logger.debug(
			{ id: block.header.id, height: block.header.height },
			'Validating block',
		);
		const blockProcessor = this._getBlockProcessor(block);
		await blockProcessor.validate.run({
			block,
		});
	}

	// processValidated processes a block assuming that statically it's valid
	public async processValidated(
		block: Block,
		{ removeFromTempTable = false }: { removeFromTempTable?: boolean } = {},
	): Promise<Block> {
		return this.sequence.add<Block>(async () => {
			this.logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Processing validated block',
			);
			const { lastBlock } = this.chainModule;
			const blockProcessor = this._getBlockProcessor(block);
			return this._processValidated(block, lastBlock, blockProcessor, {
				skipBroadcast: true,
				removeFromTempTable,
			});
		});
	}

	// apply processes a block assuming that statically it's valid without saving a block
	public async apply(block: Block): Promise<Block> {
		return this.sequence.add<Block>(async () => {
			this.logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Applying block',
			);
			const { lastBlock } = this.chainModule;
			const blockProcessor = this._getBlockProcessor(block);
			return this._processValidated(block, lastBlock, blockProcessor, {
				skipBroadcast: true,
			});
		});
	}

	public async deleteLastBlock({
		saveTempBlock = false,
	}: { saveTempBlock?: boolean } = {}): Promise<Block> {
		return this.sequence.add<Block>(async () => {
			const { lastBlock } = this.chainModule;
			this.logger.debug(
				{ id: lastBlock.header.id, height: lastBlock.header.height },
				'Deleting last block',
			);
			const blockProcessor = this._getBlockProcessor(lastBlock);
			await this._deleteBlock(lastBlock, blockProcessor, saveTempBlock);
			return this.chainModule.lastBlock;
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
		const stateStore = await this.chainModule.newStateStore();
		await processor.verify.run({
			block,
			lastBlock,
			stateStore,
		});

		if (!skipBroadcast) {
			// FIXME: this is using instance, use event emitter instead
			this.events.emit(EVENT_PROCESSOR_BRADCASRT_BLOCK, {
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

		await this.chainModule.save(block, stateStore, {
			removeFromTempTable,
		});

		return block;
	}

	private async _processGenesis(
		block: Block,
		processor: BaseBlockProcessor,
	): Promise<Block> {
		const stateStore = await this.chainModule.newStateStore();
		const isPersisted = await this.chainModule.exists(block);
		if (isPersisted) {
			return block;
		}
		await processor.applyGenesis.run({
			block,
			stateStore,
		});
		await this.chainModule.save(block, stateStore, {
			removeFromTempTable: false,
		});

		return block;
	}

	private async _deleteBlock(
		block: Block,
		processor: BaseBlockProcessor,
		saveTempBlock = false,
	): Promise<void> {
		// Offset must be set to 1, because lastBlock is still this deleting block
		const stateStore = await this.chainModule.newStateStore(1);
		await processor.undo.run({
			block,
			stateStore,
		});
		await this.chainModule.remove(block, stateStore, { saveTempBlock });
	}

	private _getBlockProcessor(block: Block): BaseBlockProcessor {
		const { version } = block.header;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!this.processors[version]) {
			throw new Error('Block processing version is not registered');
		}
		// Sort in asc order
		const matcherVersions = Object.keys(this.matchers).sort((a, b) =>
			a.localeCompare(b, 'en'),
		);
		// eslint-disable-next-line no-restricted-syntax
		for (const matcherVersion of matcherVersions) {
			const matcher = this.matchers[matcherVersion];
			if (matcher(block.header)) {
				return this.processors[matcherVersion];
			}
		}
		throw new Error('No matching block processor found');
	}
}
