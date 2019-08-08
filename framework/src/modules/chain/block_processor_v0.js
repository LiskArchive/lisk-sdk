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
const { sortTransactions } = require('./transactions');

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
	constructor({ blocksModule, dposModule, logger, constants, exceptions }) {
		super();
		this.blocksModule = blocksModule;
		this.dposModule = dposModule;
		this.logger = logger;
		this.constants = constants;
		this.exceptions = exceptions;

		this.getBytes.pipe([({ block }) => getBytes(block)]);

		this.validate.pipe([
			this._validateVersion.bind(this),
			validateSchema,
			this.blocksModule.validate.bind(this), // validate common block header
		]);

		this.fork.pipe([
			this.blocksModule.forkChoice.bind(this), // validate common block header
		]);

		this.validateNew
			.pipe([this.dposModule.validateBlockSlotWindow.bind(this)])
			.catchError(({ peerId }) => {
				this.channel.invoke('network:addPenalty', { peerId, score: 10 });
			});

		this.verify.pipe([
			this.dposModule.verify.bind(this),
			this.blocksModule.checkExists.bind(this),
			this.blocksModule.checkTransactions.bind(this),
		]);

		this.apply.pipe([
			this.blocksModule.apply.bind(this),
			this.dposModule.apply.bind(this),
		]);

		this.undo.pipe([
			this.blocksModule.undo.bind(this),
			this.dposModule.undo.bind(this),
		]);

		this.create.pipe([this._create.bind(this)]);
	}

	create({ transactions, previousBlock, keypair, timestamp }) {
		const sortedTransactions = sortTransactions(transactions);
		const nextHeight = previousBlock ? previousBlock.height + 1 : 1;
		const reward = this.blockModule.blockReward.calculateReward(nextHeight);
		let totalFee = new BigNum(0);
		let totalAmount = new BigNum(0);
		let size = 0;

		const blockTransactions = [];
		const transactionsBytesArray = [];

		// eslint-disable-next-line no-restricted-syntax
		for (const transaction of sortedTransactions) {
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
			version: BlockProcessorV0.VERSION,
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
		};

		return {
			...block,
			totalAmount: totalAmount.toString(),
			totalFee: totalAmount.toString(),
			blockSignature: signDataWithPrivateKey(
				hash(getBytes(block)),
				keypair.privateKey,
			),
		};
	}
}

BlockProcessorV0.VERSION = 0;

module.exports = {
	BlockProcessorV0,
};
