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
	baseBlockSchema,
	BlockInstance,
	Chain,
	StateStore,
} from '@liskhq/lisk-chain';
import { validator } from '@liskhq/lisk-validator';
import {
	hash,
	signDataWithPrivateKey,
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
	getAddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import { BFT } from '@liskhq/lisk-bft';
import { Dpos } from '@liskhq/lisk-dpos';
import { KVStore } from '@liskhq/lisk-db';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { BaseBlockProcessor } from './processor';
import { Logger } from '../../types';

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

interface ForgedMap {
	[address: string]:
		| {
				height: number;
				maxHeightPrevoted: number;
				maxHeightPreviouslyForged: number;
		  }
		| undefined;
}

interface CreateInput {
	readonly transactions: ReadonlyArray<BaseTransaction>;
	readonly height: number;
	readonly previousBlockId: string;
	readonly keypair: {
		publicKey: Buffer;
		privateKey: Buffer;
	};
	readonly seedReveal: string;
	readonly timestamp: number;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
	readonly stateStore: StateStore;
}

type Modify<T, R> = Omit<T, keyof R> & R;

type BlockWithoutID = Modify<
	BlockInstance,
	{
		id?: string;
	}
>;
type BlockWithoutIDAndSign = Modify<
	BlockInstance,
	{
		id?: string;
		blockSignature?: string;
	}
>;

const FORGER_INFO_KEY_PREVIOUSLY_FORGED = 'forger:previouslyForged';

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

const blockSchema = {
	...baseBlockSchema,
	properties: {
		...baseBlockSchema.properties,
		maxHeightPreviouslyForged: {
			type: 'integer',
		},
		maxHeightPrevoted: {
			type: 'integer',
		},
		seedReveal: {
			type: 'string',
			format: 'hex',
			minLength: 32,
			maxLength: 32,
		},
	},
	required: [
		...baseBlockSchema.required,
		'maxHeightPreviouslyForged',
		'maxHeightPrevoted',
		'height',
	],
};

export const getBytes = (
	block: BlockWithoutIDAndSign | BlockWithoutID,
): Buffer => {
	const blockVersionBuffer = intToBuffer(
		block.version,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const timestampBuffer = intToBuffer(
		block.timestamp,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const previousBlockBuffer = block.previousBlockId
		? Buffer.from(block.previousBlockId, 'hex')
		: Buffer.alloc(32);

	const seedRevealBuffer = Buffer.from(block.seedReveal, 'hex');

	const heightBuffer = intToBuffer(block.height, SIZE_INT32, LITTLE_ENDIAN);

	const maxHeightPreviouslyForgedBuffer = intToBuffer(
		block.maxHeightPreviouslyForged,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const maxHeightPrevotedBuffer = intToBuffer(
		block.maxHeightPrevoted,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const numTransactionsBuffer = intToBuffer(
		block.numberOfTransactions,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const totalAmountBuffer = intToBuffer(
		block.totalAmount.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const totalFeeBuffer = intToBuffer(
		block.totalFee.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const rewardBuffer = intToBuffer(
		block.reward.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const payloadLengthBuffer = intToBuffer(
		block.payloadLength,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const payloadHashBuffer = hexToBuffer(block.payloadHash);

	const generatorPublicKeyBuffer = hexToBuffer(block.generatorPublicKey);

	const blockSignatureBuffer = block.blockSignature
		? hexToBuffer(block.blockSignature)
		: Buffer.alloc(0);

	return Buffer.concat([
		blockVersionBuffer,
		timestampBuffer,
		previousBlockBuffer,
		seedRevealBuffer,
		heightBuffer,
		maxHeightPreviouslyForgedBuffer,
		maxHeightPrevotedBuffer,
		numTransactionsBuffer,
		totalAmountBuffer,
		totalFeeBuffer,
		rewardBuffer,
		payloadLengthBuffer,
		payloadHashBuffer,
		generatorPublicKeyBuffer,
		blockSignatureBuffer,
	]);
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const validateSchema = ({ block }: { block: BlockInstance }) => {
	const errors = validator.validate(blockSchema, block);
	if (errors.length) {
		throw errors;
	}
};

export class BlockProcessorV2 extends BaseBlockProcessor {
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

		this.deserialize.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async ({ block }) => this.chainModule.deserialize(block),
		]);

		this.serialize.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async ({ block }) => this.chainModule.serialize(block),
			// eslint-disable-next-line @typescript-eslint/require-await
			async (_, updatedBlock) => this.bftModule.serialize(updatedBlock),
		]);

		this.validate.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async data => this._validateVersion(data),
			// eslint-disable-next-line @typescript-eslint/require-await
			async data => validateSchema(data),
			// eslint-disable-next-line @typescript-eslint/require-await
			async ({ block }) =>
				this.chainModule.validateBlockHeader(block, getBytes(block)),
			// eslint-disable-next-line @typescript-eslint/require-await
			async ({ block }) => this.bftModule.validateBlock(block),
		]);

		this.forkStatus.pipe([
			// eslint-disable-next-line @typescript-eslint/require-await
			async ({ block, lastBlock }) =>
				this.bftModule.forkChoice(block, lastBlock), // validate common block header
		]);

		this.verify.pipe([
			async ({ block, stateStore }) => {
				let expectedReward = this.chainModule.blockReward.calculateReward(
					block.height,
				);
				const isBFTProtocolCompliant = await this.bftModule.isBFTProtocolCompliant(
					block,
				);
				if (!isBFTProtocolCompliant) {
					expectedReward /= BigInt(4);
				}
				const reward = await this._punishDPoSViolation(block, stateStore);
				if (reward === BigInt(0)) {
					expectedReward = reward;
				}
				if (block.reward !== expectedReward) {
					throw new Error(
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Invalid block reward: ${block.reward.toString()} expected: ${expectedReward}`,
					);
				}
			},
			async ({ block }) => this.dposModule.verifyBlockForger(block),
			async ({ block }) => this.bftModule.verifyNewBlock(block),
			async ({ block, stateStore, skipExistingCheck }) =>
				this.chainModule.verify(block, stateStore, {
					skipExistingCheck: !!skipExistingCheck,
				}),
		]);

		this.apply.pipe([
			async ({ block, stateStore }) =>
				this.chainModule.apply(block, stateStore),
			async ({ block, stateStore }) =>
				this.bftModule.addNewBlock(block, stateStore),
			async ({ block, stateStore }) => this.dposModule.apply(block, stateStore),
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
			async ({ block, stateStore }) => this.dposModule.apply(block, stateStore),
		]);

		this.undo.pipe([
			async ({ block, stateStore }) => this.chainModule.undo(block, stateStore),
			async ({ block, stateStore }) =>
				this.bftModule.deleteBlocks([block], stateStore),
			async ({ block, stateStore }) => this.dposModule.undo(block, stateStore),
		]);

		this.create.pipe([
			// Create a block with with basic block and bft properties
			async ({ data, stateStore }) => {
				const previouslyForgedMap = await this._getPreviouslyForgedMap();
				const delegateAddress = getAddressFromPublicKey(
					data.keypair.publicKey.toString('hex'),
				);
				// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
				const height = data.previousBlock.height + 1;
				const previousBlockId = data.previousBlock.id;
				const forgerInfo = previouslyForgedMap[delegateAddress];
				const maxHeightPreviouslyForged = forgerInfo?.height ?? 0;
				const block = await this._create({
					...data,
					height,
					previousBlockId,
					maxHeightPreviouslyForged,
					maxHeightPrevoted: this.bftModule.maxHeightPrevoted,
					stateStore,
				});

				await this._saveMaxHeightPreviouslyForged(block, previouslyForgedMap);
				return block;
			},
		]);
		/* eslint-enable @typescript-eslint/explicit-function-return-type */
	}

	private async _create({
		transactions,
		height,
		previousBlockId,
		keypair,
		seedReveal,
		timestamp,
		maxHeightPreviouslyForged,
		maxHeightPrevoted,
		stateStore,
	}: CreateInput): Promise<BlockWithoutID> {
		const reward = this.chainModule.blockReward.calculateReward(height);
		let totalFee = BigInt(0);
		let totalAmount = BigInt(0);
		let size = 0;

		const blockTransactions = [];
		const transactionsBytesArray = [];

		// eslint-disable-next-line no-plusplus,@typescript-eslint/prefer-for-of
		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i];
			const transactionBytes = transaction.getBytes();

			if (size + transactionBytes.length > this.constants.maxPayloadLength) {
				break;
			}

			size += transactionBytes.length;

			totalFee += BigInt(transaction.fee);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
			totalAmount += BigInt((transaction.asset as any).amount ?? 0);

			blockTransactions.push(transaction);
			transactionsBytesArray.push(transactionBytes);
		}

		const transactionsBuffer = Buffer.concat(transactionsBytesArray);
		const payloadHash = hash(transactionsBuffer).toString('hex');

		const block: BlockWithoutIDAndSign = {
			version: this.version,
			totalAmount,
			totalFee,
			seedReveal,
			reward,
			payloadHash,
			timestamp,
			numberOfTransactions: blockTransactions.length,
			payloadLength: size,
			previousBlockId,
			generatorPublicKey: keypair.publicKey.toString('hex'),
			transactions: blockTransactions,
			height,
			maxHeightPreviouslyForged,
			maxHeightPrevoted,
			receivedAt: undefined,
		};

		const isBFTProtocolCompliant = await this.bftModule.isBFTProtocolCompliant(
			block,
		);

		// Reduce reward based on BFT rules
		if (!isBFTProtocolCompliant) {
			block.reward /= BigInt(4);
		}

		block.reward = await this._punishDPoSViolation(block, stateStore);

		return {
			...block,
			blockSignature: signDataWithPrivateKey(
				hash(
					Buffer.concat([
						Buffer.from(this.networkIdentifier, 'hex'),
						getBytes(block),
					]),
				),
				keypair.privateKey,
			),
		};
	}

	private async _getPreviouslyForgedMap(): Promise<ForgedMap> {
		try {
			const previouslyForgedStr = await this.forgerDB.get<string>(
				FORGER_INFO_KEY_PREVIOUSLY_FORGED,
			);
			return JSON.parse(previouslyForgedStr) as ForgedMap;
		} catch (error) {
			return {};
		}
	}

	/**
	 * Saving a height which delegate last forged. this needs to be saved before broadcasting
	 * so it needs to be outside of the DB transaction
	 */
	private async _saveMaxHeightPreviouslyForged(
		block: BlockWithoutID,
		previouslyForgedMap: ForgedMap,
	): Promise<void> {
		const {
			generatorPublicKey,
			height,
			maxHeightPreviouslyForged,
			maxHeightPrevoted,
		} = block;
		const generatorAddress = getAddressFromPublicKey(generatorPublicKey);
		// In order to compare with the minimum height in case of the first block, here it should be 0
		const previouslyForged = previouslyForgedMap[generatorAddress];
		const previouslyForgedHeightByDelegate = previouslyForged?.height ?? 0;
		// previously forged height only saves maximum forged height
		if (height <= previouslyForgedHeightByDelegate) {
			return;
		}
		const updatedPreviouslyForged = {
			...previouslyForgedMap,
			[generatorAddress]: {
				height,
				maxHeightPrevoted,
				maxHeightPreviouslyForged,
			},
		};
		const previouslyForgedStr = JSON.stringify(updatedPreviouslyForged);
		await this.forgerDB.put(
			FORGER_INFO_KEY_PREVIOUSLY_FORGED,
			previouslyForgedStr,
		);
	}

	private async _punishDPoSViolation(
		block: BlockWithoutIDAndSign,
		stateStore: StateStore,
	): Promise<bigint> {
		const isDPoSProtocolCompliant = await this.dposModule.isDPoSProtocolCompliant(
			block,
			stateStore,
		);

		// Set reward to 0 if the block violates DPoS rules
		if (!isDPoSProtocolCompliant) {
			this.logger.info(
				{ generatorPublicKey: block.generatorPublicKey },
				'Punishing delegate for DPoS violation',
			);
			return BigInt(0);
		}

		return block.reward;
	}
}
