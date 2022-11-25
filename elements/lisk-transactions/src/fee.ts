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

import { getBytes } from './sign';

interface Options {
	readonly minFeePerByte?: number;
	readonly numberOfSignatures?: number;
	readonly numberOfEmptySignatures?: number;
}

const DEFAULT_MIN_FEE_PER_BYTE = 1000;
const DEFAULT_NUMBER_OF_SIGNATURES = 1;
const DEFAULT_SIGNATURE_BYTE_SIZE = 64;

const computeTransactionMinFee = (
	trx: Record<string, unknown>,
	assetSchema?: object,
	options?: Options,
): bigint => {
	const mockSignatures = new Array(
		options?.numberOfSignatures ?? DEFAULT_NUMBER_OF_SIGNATURES,
	).fill(Buffer.alloc(DEFAULT_SIGNATURE_BYTE_SIZE));
	if (options?.numberOfEmptySignatures) {
		mockSignatures.push(
			...new Array<Buffer>(options.numberOfEmptySignatures).fill(Buffer.alloc(0)),
		);
	}
	const size = getBytes(
		{
			...trx,
			signatures: mockSignatures,
		},
		assetSchema,
	).length;

	return BigInt(size * (options?.minFeePerByte ?? DEFAULT_MIN_FEE_PER_BYTE));
};

export const computeMinFee = (
	trx: Record<string, unknown>,
	assetSchema?: object,
	options?: Options,
): bigint => {
	const { fee, ...trxWithoutFee } = trx;
	trxWithoutFee.fee = BigInt(0);
	let minFee = computeTransactionMinFee(trxWithoutFee, assetSchema, options);

	while (minFee > BigInt(trxWithoutFee.fee as bigint)) {
		// eslint-disable-next-line no-param-reassign
		trxWithoutFee.fee = minFee;
		minFee = computeTransactionMinFee(trxWithoutFee, assetSchema, options);
	}
	return minFee;
};
