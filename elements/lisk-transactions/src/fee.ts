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

export interface Options {
	readonly minFeePerByte?: number;
	readonly numberOfSignatures?: number;
	readonly numberOfEmptySignatures?: number;
}

const DEFAULT_MIN_FEE_PER_BYTE = 1000;
const DEFAULT_NUMBER_OF_SIGNATURES = 1;
const DEFAULT_SIGNATURE_BYTE_SIZE = 64;

export const computeMinFee = (
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

	const { ...transaction } = trx;
	transaction.signatures = mockSignatures;
	transaction.fee = BigInt(0);

	let minFee = BigInt(0);

	do {
		transaction.fee = minFee;
		const size = getBytes(transaction, assetSchema).length;
		minFee = BigInt(size * (options?.minFeePerByte ?? DEFAULT_MIN_FEE_PER_BYTE));
	} while (minFee > BigInt(transaction.fee as bigint));

	return minFee;
};
