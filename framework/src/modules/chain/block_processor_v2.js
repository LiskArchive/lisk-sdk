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

const BigNum = require('@liskhq/bignum');
const { validator } = require('@liskhq/lisk-validator');
const {
	BIG_ENDIAN,
	hash,
	signDataWithPrivateKey,
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
} = require('@liskhq/lisk-cryptography');
const { baseBlockSchema } = require('./blocks');
const { BaseBlockProcessor } = require('./processor');

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

const blockSchema = {
	...baseBlockSchema,
	properties: {
		...baseBlockSchema.properties,
		maxHeightPreviouslyForged: {
			type: 'integer',
		},
		prevotedConfirmedUptoHeight: {
			type: 'integer',
		},
	},
	required: [
		...baseBlockSchema.required,
		'maxHeightPreviouslyForged',
		'prevotedConfirmedUptoHeight',
		'height',
	],
};

/**
 * Creates bytebuffer out of block data used for signatures.
 *
 * @param {block} block
 * @throws {Error}
 * @returns {!Array} Contents as an ArrayBuffer
 * @todo Add description for the function and the params
 */
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

	const heightBuffer = intToBuffer(block.height, SIZE_INT32, LITTLE_ENDIAN);

	const maxHeightPreviouslyForgedBuffer = intToBuffer(
		block.maxHeightPreviouslyForged,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const prevotedConfirmedUptoHeightBuffer = intToBuffer(
		block.prevotedConfirmedUptoHeight,
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
		heightBuffer,
		maxHeightPreviouslyForgedBuffer,
		prevotedConfirmedUptoHeightBuffer,
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
		blocksModule,
		bftModule,
		dposModule,
		logger,
		constants,
		exceptions,
	}) {
		super();
		this.blocksModule = blocksModule;
		this.bftModule = bftModule;
		this.dposModule = dposModule;
		this.logger = logger;
		this.constants = constants;
		this.exceptions = exceptions;

		this.init.pipe([() => this.bftModule.init()]);

		this.deserialize.pipe([
			({ block }) => this.blocksModule.deserialize(block),
		]);

		this.serialize.pipe([
			({ block }) => this.blocksModule.serialize(block),
			(_, updatedBlock) => this.bftModule.serialize(updatedBlock),
		]);

		this.validate.pipe([
			data => this._validateVersion(data),
			data => validateSchema(data),
			({ block }) => {
				let expectedReward = this.blocksModule.blockReward.calculateReward(
					block.height,
				);
				if (!this.bftModule.isBFTProtocolCompliant(block)) {
					expectedReward *= 0.25;
				}
				this.blocksModule.validateBlockHeader(
					block,
					getBytes(block),
					expectedReward,
				);
			},
			({ block, lastBlock }) =>
				this.blocksModule.verifyInMemory(block, lastBlock),
			({ block }) => this.dposModule.verifyBlockForger(block),
			({ block }) => this.bftModule.validateBlock(block),
		]);

		this.validateDetached.pipe([
			data => this._validateVersion(data),
			data => validateSchema(data),
			async ({ block }) => {
				let expectedReward = this.blocksModule.blockReward.calculateReward(
					block.height,
				);
				if (!this.bftModule.isBFTProtocolCompliant(block)) {
					expectedReward *= 0.25;
				}
				await this.blocksModule.validateBlockHeader(
					block,
					getBytes(block),
					expectedReward,
				);
			},
		]);

		this.forkStatus.pipe([
			({ block, lastBlock }) => this.bftModule.forkChoice(block, lastBlock), // validate common block header
		]);

		this.verify.pipe([({ block }) => this.bftModule.verifyNewBlock(block)]);

		this.apply.pipe([
			({ block, stateStore, skipExistingCheck }) =>
				this.blocksModule.verify(block, stateStore, { skipExistingCheck }),
			({ block, stateStore }) => this.blocksModule.apply(block, stateStore),
			({ block, tx }) => this.dposModule.apply(block, { tx }),
			({ block, tx }) => this.bftModule.addNewBlock(block, tx),
		]);

		this.applyGenesis.pipe([
			({ block, stateStore }) =>
				this.blocksModule.applyGenesis(block, stateStore),
			({ block, tx }) => this.dposModule.apply(block, { tx }),
		]);

		this.undo.pipe([
			({ block, stateStore }) => this.blocksModule.undo(block, stateStore),
			({ block, tx }) => this.dposModule.undo(block, { tx }),
			({ block }) => this.bftModule.deleteBlocks([block]),
		]);

		this.create.pipe([
			// Getting the BFT header (maxHeightPreviouslyForged and prevotedConfirmedUptoHeight)
			async ({ keypair }) => {
				const delegatePublicKey = keypair.publicKey.toString('hex');
				return this.bftModule.computeBFTHeaderProperties(delegatePublicKey);
			},
			// Create a block with with basic block and bft properties
			(data, bftHeader) => this._create({ ...data, ...bftHeader }),
			async (data, block) => {
				// Saving maxHeightPreviouslyForged before broadcasting
				await this.bftModule.saveMaxHeightPreviouslyForged(
					block.generatorPublicKey,
					block.height,
				);
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
		previousBlock,
		keypair,
		timestamp,
		maxHeightPreviouslyForged,
		prevotedConfirmedUptoHeight,
	}) {
		const nextHeight = previousBlock ? previousBlock.height + 1 : 1;

		const reward = this.blocksModule.blockReward.calculateReward(nextHeight);
		let totalFee = new BigNum(0);
		let totalAmount = new BigNum(0);
		let size = 0;

		const blockTransactions = [];
		const transactionsBytesArray = [];

		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i];
			const transactionBytes = transaction.getBytes(transaction);

			if (size + transactionBytes.length > this.constants.maxPayloadLength) {
				break;
			}

			size += transactionBytes.length;

			totalFee = totalFee.plus(transaction.fee);
			totalAmount = totalAmount.plus(transaction.asset.amount || 0);

			blockTransactions.push(transaction);
			transactionsBytesArray.push(transactionBytes);
		}

		const transactionsBuffer = Buffer.concat(transactionsBytesArray);
		const payloadHash = hash(transactionsBuffer).toString('hex');

		const block = {
			version: this.version,
			totalAmount,
			totalFee,
			reward,
			payloadHash,
			timestamp,
			numberOfTransactions: blockTransactions.length,
			payloadLength: size,
			previousBlockId: previousBlock.id,
			generatorPublicKey: keypair.publicKey.toString('hex'),
			transactions: blockTransactions,
			height: nextHeight,
			maxHeightPreviouslyForged,
			prevotedConfirmedUptoHeight,
		};

		// Reduce reward based on BFT rules
		if (!this.bftModule.isBFTProtocolCompliant(block)) {
			block.reward = block.reward.times(0.25);
		}

		return {
			...block,
			blockSignature: signDataWithPrivateKey(
				hash(getBytes(block)),
				keypair.privateKey,
			),
		};
	}
}

module.exports = {
	BlockProcessorV2,
	getBytes,
};
