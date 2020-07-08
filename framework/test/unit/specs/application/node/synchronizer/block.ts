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
	hash,
	signDataWithPrivateKey,
	getPrivateAndPublicKeyBytesFromPassphrase,
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
} from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { BlockInstance } from '@liskhq/lisk-chain';
import * as genesisBlock from '../../../../../fixtures/config/devnet/genesis_block.json';
import { getTransactionRoot } from '../../../../../../src/application/node/block_processor_v2';

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

export const getBytes = (block: BlockInstance): Buffer => {
	const blockVersionBuffer = intToBuffer(block.version, SIZE_INT32, LITTLE_ENDIAN);

	const timestampBuffer = intToBuffer(block.timestamp, SIZE_INT32, LITTLE_ENDIAN);

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

	const maxHeightPrevotedBuffer = intToBuffer(block.maxHeightPrevoted, SIZE_INT32, LITTLE_ENDIAN);

	const numTransactionsBuffer = intToBuffer(block.numberOfTransactions, SIZE_INT32, LITTLE_ENDIAN);

	const totalAmountBuffer = intToBuffer(block.totalAmount.toString(), SIZE_INT64, LITTLE_ENDIAN);

	const totalFeeBuffer = intToBuffer(block.totalFee.toString(), SIZE_INT64, LITTLE_ENDIAN);

	const rewardBuffer = intToBuffer(block.reward.toString(), SIZE_INT64, LITTLE_ENDIAN);

	const payloadLengthBuffer = intToBuffer(block.payloadLength, SIZE_INT32, LITTLE_ENDIAN);

	const transactionRootBuffer = hexToBuffer(block.transactionRoot);

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
		transactionRootBuffer,
		generatorPublicKeyBuffer,
		blockSignatureBuffer,
	]);
};

const sortTransactions = (transactions: BaseTransaction[]) =>
	transactions.sort((a, b) => (a.type > b.type || a.id > b.id ? 1 : -1));

const getKeyPair = () => {
	const passphrase = Mnemonic.generateMnemonic();
	const {
		publicKeyBytes: publicKey,
		privateKeyBytes: privateKey,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	return {
		publicKey,
		privateKey,
	};
};

const calculateTransactionsInfo = (block: BlockInstance) => {
	const sortedTransactions = sortTransactions(block.transactions);
	const transactionIds = [];
	let totalFee = BigInt(0);
	let totalAmount = BigInt(0);
	let payloadLength = 0;

	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < sortedTransactions.length; i += 1) {
		const transaction = sortedTransactions[i];
		const transactionBytes = transaction.getBytes();

		totalFee += BigInt(transaction.fee);
		totalAmount += BigInt((transaction.asset as any).amount ?? '0');

		payloadLength += transactionBytes.length;
		transactionIds.push(transaction.id);
	}

	const transactionRoot = getTransactionRoot(transactionIds);

	return {
		totalFee,
		totalAmount,
		transactionRoot,
		payloadLength,
		numberOfTransactions: block.transactions.length,
	};
};

const defaultNetworkIdentifier = '93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';
/**
 * Utility function to create a block object with valid computed properties while any property can be overridden
 * Calculates the signature, transactionRoot etc. internally. Facilitating the creation of block with valid signature and other properties
 */
export const newBlock = (
	block?: Partial<BlockInstance>,
	networkIdentifier = defaultNetworkIdentifier,
): BlockInstance => {
	const defaultBlockValues = {
		version: 2,
		height: 2,
		maxHeightPreviouslyForged: 0,
		maxHeightPrevoted: 0,
		previousBlockId: genesisBlock.id,
		seedReveal: '00000000000000000000000000000000',
		keypair: getKeyPair(),
		transactions: [],
		reward: BigInt(0),
		timestamp: 1000,
	};
	const blockWithDefaultValues = {
		...defaultBlockValues,
		...block,
	};

	const transactionsInfo = calculateTransactionsInfo(blockWithDefaultValues as BlockInstance);
	const blockWithCalculatedProperties = {
		...transactionsInfo,
		...blockWithDefaultValues,
		generatorPublicKey: blockWithDefaultValues.keypair.publicKey.toString('hex'),
	};

	const { keypair } = blockWithCalculatedProperties;
	delete blockWithCalculatedProperties.keypair;

	// eslint-disable-next-line new-cap
	const blockWithSignature = {
		...blockWithCalculatedProperties,
		blockSignature: signDataWithPrivateKey(
			Buffer.concat([
				Buffer.from(networkIdentifier, 'hex'),
				getBytes(blockWithCalculatedProperties as BlockInstance),
			]),
			keypair.privateKey,
		),
	};
	const hashedBlockBytes = hash(getBytes(blockWithSignature as BlockInstance));

	return {
		...blockWithSignature,
		id: hashedBlockBytes.toString('hex'),
	} as BlockInstance;
};
