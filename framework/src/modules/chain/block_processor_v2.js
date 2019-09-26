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

	const previousBlockBuffer = block.previousBlock
		? intToBuffer(block.previousBlock, SIZE_INT64, BIG_ENDIAN)
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

// const validateAndVerifyBFTproperties = ({ block }) => {
// 	const blockHeader = extractBFTBlockHeaderFromBlock(block);
//
// 	// Check heightPrevoted correctness.
// 	utils.validateBlockHeader(blockHeader);
//
// 	// Check for header contradictions against current chain
// 	bft.verifyBlockHeaders(blockHeader);
//
// 	// Check reward has correct value.
// 	// TODO: Find out how to do this.
// };

class BlockProcessorV2 extends BaseBlockProcessor {
	constructor({ blocksModule, bftModule, logger, constants, exceptions }) {
		super();
		this.blocksModule = blocksModule;
		this.bftModule = bftModule;
		this.logger = logger;
		this.constants = constants;
		this.exceptions = exceptions;

		this.init.pipe([() => this.bftModule.init()]);

		this.validate.pipe([
			data => this._validateVersion(data),
			data => validateSchema(data),
			({ block }) => getBytes(block),
			(data, blockBytes) =>
				this.blocksModule.validateDetached({
					...data,
					blockBytes,
				}), // validate common block header
			data => this.blocksModule.verifyInMemory(data),
			({ block }) => this.bftModule.validateBlock(block),
		]);

		this.validateDetached.pipe([
			data => this._validateVersion(data),
			data => validateSchema(data),
			({ block }) => getBytes(block),
			(data, blockBytes) =>
				this.blocksModule.validateDetached({
					...data,
					blockBytes,
				}), // validate common block header
		]);

		this.forkStatus.pipe([
			data => this.blocksModule.forkChoice(data), // validate common block header
		]);

		// TODO: Remove validate new since it's no longer required
		this.validateNew.pipe([() => Promise.resolve()]);

		this.verify.pipe([({ block }) => this.bftModule.verifyNewBlock(block)]);

		this.apply.pipe([
			data => this.blocksModule.verify(data),
			data => this.blocksModule.apply(data),
			({ block, tx }) => this.bftModule.addNewBlock(block, tx),
		]);

		this.applyGenesis.pipe([data => this.blocksModule.applyGenesis(data)]);

		this.undo.pipe([data => this.blocksModule.undo(data)]);

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
			totalAmount = totalAmount.plus(transaction.amount);

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
			previousBlock: previousBlock.id,
			generatorPublicKey: keypair.publicKey.toString('hex'),
			transactions: blockTransactions,
			height: nextHeight,
			maxHeightPreviouslyForged,
			prevotedConfirmedUptoHeight,
		};

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
};
