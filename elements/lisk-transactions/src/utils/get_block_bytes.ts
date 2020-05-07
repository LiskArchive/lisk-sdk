/*
 * Copyright © 2020 Lisk Foundation
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
 *
 */

import {
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
} from '@liskhq/lisk-cryptography';

import { BlockHeaderJSON } from '../transaction_types';

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

export const getBlockBytes = (block: BlockHeaderJSON): Buffer => {
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

	const previousBlockBuffer = block.previousBlockId ? Buffer.from(block.previousBlockId, 'hex') : Buffer.alloc(32);

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
	]);
};

export const getBlockBytesWithSignature = (block: BlockHeaderJSON): Buffer => {
	const blockBuffer = getBlockBytes(block);
	const blockSignatureBuffer = block.blockSignature
		? hexToBuffer(block.blockSignature)
		: Buffer.alloc(0);

	return Buffer.concat([blockBuffer, blockSignatureBuffer]);
};
