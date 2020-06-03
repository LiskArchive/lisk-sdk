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
	Block,
	Chain,
	StateStore,
	BufferMap,
	BlockHeader,
} from '@liskhq/lisk-chain';
import {
	signDataWithPrivateKey,
	getAddressFromPublicKey,
	hash,
} from '@liskhq/lisk-cryptography';
import { BFT } from '@liskhq/lisk-bft';
import { Dpos } from '@liskhq/lisk-dpos';
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { MerkleTree } from '@liskhq/lisk-tree';
import { BaseBlockProcessor } from './processor';
import { Logger } from '../logger';

interface BlockProcessorInput {
	readonly networkIdentifier: string;
	readonly chainModule: Chain;
	readonly bftModule: BFT;
	readonly dposModule: Dpos;
	readonly forgerDB: KVStore;
	readonly logger: Logger;
	readonly constants: {
		readonly maxPayloadLength: number;
	};
}

interface ForgedInfo {
	height: number;
	maxHeightPrevoted: number;
	maxHeightPreviouslyForged: number;
}

interface CreateInput {
	readonly transactions: ReadonlyArray<BaseTransaction>;
	readonly height: number;
	readonly previousBlockID: Buffer;
	readonly keypair: {
		publicKey: Buffer;
		privateKey: Buffer;
	};
	readonly seedReveal: Buffer;
	readonly timestamp: number;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
	readonly stateStore: StateStore;
}

export interface BlockHeaderAsset {
	readonly seedReveal: Buffer;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
}

const DB_KEY_FORGER_PREVIOUSLY_FORGED = 'forger:previouslyForged';

export const getTransactionRoot = (ids: Buffer[]): Buffer => {
	const tree = new MerkleTree(ids);

	return tree.root;
};

export class BlockProcessorV2 extends BaseBlockProcessor {
	public static readonly schema = {
		$id: 'test/defaultBlockHeaderAssetSchema',
		type: 'object',
		properties: {
			maxHeightPreviouslyForged: {
				dataType: 'uint32',
				fieldNumber: 1,
			},
			maxHeightPrevoted: {
				dataType: 'uint32',
				fieldNumber: 2,
			},
			seedReveal: {
				dataType: 'bytes',
				fieldNumber: 3,
			},
		},
		required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
	};

	public readonly version = 2;

	private readonly networkIdentifier: string;
	private readonly chainModule: Chain;
	private readonly bftModule: BFT;
	private readonly dposModule: Dpos;
	private readonly forgerDB: KVStore;
	private readonly logger: Logger;
	private readonly constants: {
		readonly maxPayloadLength: number;
	};

	public constructor({
		networkIdentifier,
		chainModule,
		bftModule,
		dposModule,
		forgerDB,
		logger,
		constants,
	}: BlockProcessorInput) {
		super();
		this.networkIdentifier = networkIdentifier;
		this.chainModule = chainModule;
		this.bftModule = bftModule;
		this.dposModule = dposModule;
		this.logger = logger;
		this.forgerDB = forgerDB;
		this.constants = constants;

		/* eslint-disable @typescript-eslint/explicit-function-return-type */
		this.init.pipe([async ({ stateStore }) => this.bftModule.init(stateStore)]);

		this.validate.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async data => this._validateVersion(data),
			// eslint-disable-next-line @typescript-eslint/require-await
			async ({ block }) => this.chainModule.validateBlockHeader(block),
		]);

		this.forkStatus.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async ({ block, lastBlock }) =>
				this.bftModule.forkChoice(block.header, lastBlock.header), // validate common block header
		]);

		this.verify.pipe([
			async ({ block, stateStore }) => {
				let expectedReward = this.chainModule.blockReward.calculateReward(
					block.header.height,
				);
				const isBFTProtocolCompliant = await this.bftModule.isBFTProtocolCompliant(
					block.header,
				);
				if (!isBFTProtocolCompliant) {
					expectedReward /= BigInt(4);
				}
				const reward = await this._punishDPoSViolation(
					block.header,
					stateStore,
				);
				if (reward === BigInt(0)) {
					expectedReward = reward;
				}
				if (block.header.reward !== expectedReward) {
					throw new Error(
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Invalid block reward: ${block.header.reward.toString()} expected: ${expectedReward}`,
					);
				}
			},
			async ({ block }) => this.dposModule.verifyBlockForger(block.header),
			async ({ block }) => this.bftModule.verifyNewBlock(block.header),
			async ({ block, stateStore, skipExistingCheck }) =>
				this.chainModule.verify(block, stateStore, {
					skipExistingCheck: !!skipExistingCheck,
				}),
		]);

		this.apply.pipe([
			async ({ block, stateStore }) =>
				this.chainModule.apply(block, stateStore),
			async ({ block, stateStore }) =>
				this.bftModule.addNewBlock(block.header, stateStore),
			async ({ block, stateStore }) =>
				this.dposModule.apply(block.header, stateStore),
			async ({ stateStore }) => {
				await this.dposModule.onBlockFinalized(
					stateStore,
					this.bftModule.finalizedHeight,
				);
			},
		]);

		this.applyGenesis.pipe([
			async ({ block, stateStore }) =>
				this.chainModule.applyGenesis(block, stateStore),
			async ({ block, stateStore }) =>
				this.dposModule.apply(block.header, stateStore),
		]);

		this.undo.pipe([
			async ({ block, stateStore }) => this.chainModule.undo(block, stateStore),
			async ({ block, stateStore }) =>
				this.bftModule.deleteBlocks([block.header], stateStore),
			async ({ block, stateStore }) =>
				this.dposModule.undo(block.header, stateStore),
		]);

		this.create.pipe([
			// Create a block with with basic block and bft properties
			async ({ data, stateStore }) => {
				const previouslyForgedMap = await this._getPreviouslyForgedMap();
				const delegateAddress = getAddressFromPublicKey(data.keypair.publicKey);
				// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
				const height = data.previousBlock.header.height + 1;
				const previousBlockID = data.previousBlock.header.id;
				const forgerInfo = previouslyForgedMap.get(delegateAddress);
				const maxHeightPreviouslyForged = forgerInfo?.height ?? 0;
				const block = await this._create({
					...data,
					height,
					previousBlockID,
					maxHeightPreviouslyForged,
					maxHeightPrevoted: this.bftModule.maxHeightPrevoted,
					stateStore,
				});

				await this._saveMaxHeightPreviouslyForged(
					block.header,
					previouslyForgedMap,
				);
				return block;
			},
		]);
		/* eslint-enable @typescript-eslint/explicit-function-return-type */
	}

	private async _create({
		transactions,
		height,
		previousBlockID,
		keypair,
		seedReveal,
		timestamp,
		maxHeightPreviouslyForged,
		maxHeightPrevoted,
		stateStore,
	}: CreateInput): Promise<Block<BlockHeaderAsset>> {
		const reward = this.chainModule.blockReward.calculateReward(height);
		let size = 0;

		const blockTransactions = [];
		const transactionIds = [];

		for (const transaction of transactions) {
			const transactionBytes = transaction.getBytes();

			if (size + transactionBytes.length > this.constants.maxPayloadLength) {
				break;
			}

			size += transactionBytes.length;
			blockTransactions.push(transaction);
			transactionIds.push(transaction.id);
		}

		const transactionRoot = getTransactionRoot(transactionIds);

		const header = {
			version: this.version,
			height,
			reward,
			transactionRoot,
			previousBlockID,
			timestamp,
			generatorPublicKey: keypair.publicKey,
			asset: {
				seedReveal,
				maxHeightPreviouslyForged,
				maxHeightPrevoted,
			},
		};

		const isBFTProtocolCompliant = await this.bftModule.isBFTProtocolCompliant(
			header as BlockHeader<BlockHeaderAsset>,
		);

		// Reduce reward based on BFT rules
		if (!isBFTProtocolCompliant) {
			header.reward /= BigInt(4);
		}

		header.reward = await this._punishDPoSViolation(
			header as BlockHeader<BlockHeaderAsset>,
			stateStore,
		);

		const headerBytesWithoutSignature = this.chainModule.dataAccess.encodeBlockHeader(
			header as BlockHeader<BlockHeaderAsset>,
			true,
		);
		const signature = signDataWithPrivateKey(
			Buffer.concat([
				Buffer.from(this.networkIdentifier, 'hex'),
				headerBytesWithoutSignature,
			]),
			keypair.privateKey,
		);
		const headerBytes = this.chainModule.dataAccess.encodeBlockHeader({
			...header,
			signature,
		} as BlockHeader<BlockHeaderAsset>);
		const id = hash(headerBytes);

		return {
			header: {
				...header,
				signature,
				id,
			},
			payload: blockTransactions,
		};
	}

	private async _getPreviouslyForgedMap(): Promise<BufferMap<ForgedInfo>> {
		try {
			const previouslyForgedBuffer = await this.forgerDB.get(
				DB_KEY_FORGER_PREVIOUSLY_FORGED,
			);
			const parsedMap = JSON.parse(previouslyForgedBuffer.toString('utf8')) as {
				[address: string]: ForgedInfo;
			};
			const result = new BufferMap<ForgedInfo>();
			for (const address of Object.keys(parsedMap)) {
				result.set(Buffer.from(address, 'binary'), parsedMap[address]);
			}
			return result;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return new BufferMap<ForgedInfo>();
		}
	}

	/**
	 * Saving a height which delegate last forged. this needs to be saved before broadcasting
	 * so it needs to be outside of the DB transaction
	 */
	private async _saveMaxHeightPreviouslyForged(
		header: BlockHeader,
		previouslyForgedMap: BufferMap<ForgedInfo>,
	): Promise<void> {
		const generatorAddress = getAddressFromPublicKey(header.generatorPublicKey);
		// In order to compare with the minimum height in case of the first block, here it should be 0
		const previouslyForged = previouslyForgedMap.get(generatorAddress);
		const previouslyForgedHeightByDelegate = previouslyForged?.height ?? 0;
		// previously forged height only saves maximum forged height
		if (header.height <= previouslyForgedHeightByDelegate) {
			return;
		}
		previouslyForgedMap.set(generatorAddress, {
			height: header.height,
			maxHeightPrevoted: header.asset.maxHeightPrevoted as number,
			maxHeightPreviouslyForged: header.asset.maxHeightPreviouslyForged,
		});

		const parsedPreviouslyForgedMap: { [key: string]: ForgedInfo } = {};
		for (const [key, value] of previouslyForgedMap.entries()) {
			parsedPreviouslyForgedMap[key.toString('binary')] = value;
		}

		const previouslyForgedStr = JSON.stringify(parsedPreviouslyForgedMap);
		await this.forgerDB.put(
			DB_KEY_FORGER_PREVIOUSLY_FORGED,
			Buffer.from(previouslyForgedStr, 'utf8'),
		);
	}

	private async _punishDPoSViolation(
		header: BlockHeader,
		stateStore: StateStore,
	): Promise<bigint> {
		const isDPoSProtocolCompliant = await this.dposModule.isDPoSProtocolCompliant(
			header,
			stateStore,
		);

		// Set reward to 0 if the block violates DPoS rules
		if (!isDPoSProtocolCompliant) {
			this.logger.info(
				{ generatorPublicKey: header.generatorPublicKey.toString('base64') },
				'Punishing delegate for DPoS violation',
			);
			return BigInt(0);
		}

		return header.reward;
	}
}
