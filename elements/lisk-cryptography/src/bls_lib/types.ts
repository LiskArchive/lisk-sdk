/*
 * Copyright © 2021 Lisk Foundation
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

export interface BlsLib {
	blsKeyValidate: (pk: Buffer) => boolean;
	blsKeyGen: (ikm: Buffer) => Buffer;
	blsSkToPk: (sk: Buffer) => Buffer;
	blsAggregate: (signatures: Buffer[]) => Buffer | false;
	blsSign: (sk: Buffer, message: Buffer) => Buffer;
	blsVerify: (pk: Buffer, message: Buffer, signature: Buffer) => boolean;
	blsAggregateVerify: (
		publicKeys: ReadonlyArray<Buffer>,
		messages: ReadonlyArray<Buffer>,
		signature: Buffer,
	) => boolean;
	blsFastAggregateVerify: (
		publicKeys: ReadonlyArray<Buffer>,
		messages: Buffer,
		signature: Buffer,
	) => boolean;
	blsPopProve: (sk: Buffer) => Buffer;
	blsPopVerify: (pk: Buffer, proof: Buffer) => boolean;
}
