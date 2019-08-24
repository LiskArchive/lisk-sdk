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
const {
	BIG_ENDIAN,
	hash,
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
	signDataWithPrivateKey,
} = require('@liskhq/lisk-cryptography');
const { validator } = require('@liskhq/lisk-validator');
const { BlockProcessor } = require('./processor');
const { baseBlockSchema } = require('./blocks');

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

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
	const errors = validator.validate(baseBlockSchema, block);
	if (errors.length) {
		throw errors;
	}
};

class BlockProcessorV0 extends BlockProcessor {
	constructor({ blocksModule, logger, constants, exceptions }) {
		super();
		this.blocksModule = blocksModule;
		this.logger = logger;
		this.constants = constants;
		this.exceptions = exceptions;

		this.init.pipe([() => this.blocksModule.init()]);
		this.getBytes.pipe([({ block }) => getBytes(block)]);

		this.validate.pipe([
			data => this._validateVersion(data),
			validateSchema,
			({ block }) => getBytes(block),
			(data, blockBytes) => {
				this.blocksModule.validate({
					...data,
					blockBytes,
				}); // validate common block header
			},
		]);

		this.fork.pipe([
			data => this.blocksModule.forkChoice(data), // validate common block header
		]);

		this.validateNew.pipe([data => this.blocksModule.validateNew(data)]);

		this.verify.pipe([data => this.blocksModule.verify(data)]);

		this.apply.pipe([data => this.blocksModule.apply(data)]);

		this.applyGenesis.pipe([data => this.blocksModule.applyGenesis(data)]);

		this.undo.pipe([data => this.blocksModule.undo(data)]);

		this.create.pipe([data => this._create(data)]);
	}

	// eslint-disable-next-line class-methods-use-this
	get version() {
		return 0;
	}

	async _create({ transactions, previousBlock, keypair, timestamp }) {
		const nextHeight = previousBlock ? previousBlock.height + 1 : 1;
		const reward = this.blocksModule.blockReward.calculateReward(nextHeight);
		let totalFee = new BigNum(0);
		let totalAmount = new BigNum(0);
		let size = 0;

		const trs = transactions || [];
		const blockTransactions = [];
		const transactionsBytesArray = [];

		// eslint-disable-next-line no-restricted-syntax
		for (const transaction of trs) {
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
			height: nextHeight,
			reward,
			payloadHash,
			timestamp,
			numberOfTransactions: blockTransactions.length,
			payloadLength: size,
			previousBlock: previousBlock.id,
			generatorPublicKey: keypair.publicKey.toString('hex'),
			transactions: blockTransactions,
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
	BlockProcessorV0,
};
