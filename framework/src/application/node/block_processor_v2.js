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

'use strict';

const { baseBlockSchema } = require('@liskhq/lisk-chain');
const { validator } = require('@liskhq/lisk-validator');
const {
	BIG_ENDIAN,
	hash,
	signDataWithPrivateKey,
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
	getAddressFromPublicKey,
} = require('@liskhq/lisk-cryptography');
const { BaseBlockProcessor } = require('./processor');

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

const getBytes = block => {
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
		? intToBuffer(block.previousBlockId, SIZE_INT64, BIG_ENDIAN)
		: Buffer.alloc(SIZE_INT64);

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

const validateSchema = ({ block }) => {
	const errors = validator.validate(blockSchema, block);
	if (errors.length) {
		throw errors;
	}
};

class BlockProcessorV2 extends BaseBlockProcessor {
	constructor({
		networkIdentifier,
		chainModule,
		bftModule,
		dposModule,
		storage,
		logger,
		constants,
	}) {
		super();
		this.networkIdentifier = networkIdentifier;
		this.chainModule = chainModule;
		this.bftModule = bftModule;
		this.dposModule = dposModule;
		this.logger = logger;
		this.storage = storage;
		this.constants = constants;

		this.init.pipe([({ stateStore }) => this.bftModule.init(stateStore)]);

		this.deserialize.pipe([({ block }) => this.chainModule.deserialize(block)]);

		this.serialize.pipe([
			({ block }) => this.chainModule.serialize(block),
			(_, updatedBlock) => this.bftModule.serialize(updatedBlock),
		]);

		this.validate.pipe([
			data => this._validateVersion(data),
			data => validateSchema(data),
			({ block }) =>
				this.chainModule.validateBlockHeader(block, getBytes(block)),
			({ block }) => this.bftModule.validateBlock(block),
		]);

		this.forkStatus.pipe([
			({ block, lastBlock }) => this.bftModule.forkChoice(block, lastBlock), // validate common block header
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
						`Invalid block reward: ${block.reward.toString()} expected: ${expectedReward}`,
					);
				}
			},
			({ block }) => this.dposModule.verifyBlockForger(block),
			({ block }) => this.bftModule.verifyNewBlock(block),
			({ block, stateStore, skipExistingCheck }) =>
				this.chainModule.verify(block, stateStore, { skipExistingCheck }),
		]);

		this.apply.pipe([
			({ block, stateStore }) => this.chainModule.apply(block, stateStore),
			({ block, stateStore }) => this.bftModule.addNewBlock(block, stateStore),
			({ block, stateStore }) => this.dposModule.apply(block, stateStore),
			({ stateStore }) => {
				this.dposModule.onBlockFinalized(
					stateStore,
					this.bftModule.finalizedHeight,
				);
			},
		]);

		this.applyGenesis.pipe([
			({ block, stateStore }) =>
				this.chainModule.applyGenesis(block, stateStore),
			({ block, stateStore }) => this.dposModule.apply(block, stateStore),
		]);

		this.undo.pipe([
			({ block, stateStore }) => this.chainModule.undo(block, stateStore),
			({ block, stateStore }) =>
				this.bftModule.deleteBlocks([block], stateStore),
			({ block, stateStore }) => this.dposModule.undo(block, stateStore),
		]);

		this.create.pipe([
			// Create a block with with basic block and bft properties
			async ({ data, stateStore }) => {
				const previouslyForgedMap = await this._getPreviouslyForgedMap();
				const delegateAddress = getAddressFromPublicKey(
					data.keypair.publicKey.toString('hex'),
				);
				const height = data.previousBlock.height + 1;
				const previousBlockId = data.previousBlock.id;
				const forgerInfo = previouslyForgedMap[delegateAddress] || {};
				const maxHeightPreviouslyForged = forgerInfo.height || 0;
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
	}

	// eslint-disable-next-line class-methods-use-this
	get version() {
		return 2;
	}

	async _create({
		transactions,
		height,
		previousBlockId,
		keypair,
		seedReveal,
		timestamp,
		maxHeightPreviouslyForged,
		maxHeightPrevoted,
		stateStore,
	}) {
		const reward = this.chainModule.blockReward.calculateReward(height);
		let totalFee = BigInt(0);
		let totalAmount = BigInt(0);
		let size = 0;

		const blockTransactions = [];
		const transactionsBytesArray = [];

		// eslint-disable-next-line no-plusplus,@typescript-eslint/prefer-for-of
		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i];
			const transactionBytes = transaction.getBytes(transaction);

			if (size + transactionBytes.length > this.constants.maxPayloadLength) {
				break;
			}

			size += transactionBytes.length;

			totalFee += BigInt(transaction.fee);
			totalAmount += BigInt(transaction.asset.amount || 0);

			blockTransactions.push(transaction);
			transactionsBytesArray.push(transactionBytes);
		}

		const transactionsBuffer = Buffer.concat(transactionsBytesArray);
		const payloadHash = hash(transactionsBuffer).toString('hex');

		const block = {
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

	async _getPreviouslyForgedMap() {
		const previouslyForgedStr = await this.storage.entities.ForgerInfo.getKey(
			FORGER_INFO_KEY_PREVIOUSLY_FORGED,
		);
		return previouslyForgedStr ? JSON.parse(previouslyForgedStr) : {};
	}

	/**
	 * Saving a height which delegate last forged. this needs to be saved before broadcasting
	 * so it needs to be outside of the DB transaction
	 */
	async _saveMaxHeightPreviouslyForged(block, previouslyForgedMap) {
		const {
			generatorPublicKey,
			height,
			maxHeightPreviouslyForged,
			maxHeightPrevoted,
		} = block;
		const generatorAddress = getAddressFromPublicKey(generatorPublicKey);
		// In order to compare with the minimum height in case of the first block, here it should be 0
		const previouslyForged = previouslyForgedMap[generatorAddress] || {};
		const previouslyForgedHeightByDelegate = previouslyForged.height || 0;
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
		await this.storage.entities.ForgerInfo.setKey(
			FORGER_INFO_KEY_PREVIOUSLY_FORGED,
			previouslyForgedStr,
		);
	}

	async _punishDPoSViolation(block, stateStore) {
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

module.exports = {
	BlockProcessorV2,
	getBytes,
};
