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
 */

import { codec } from '@liskhq/lisk-codec';
import { BlockHeader } from './block_header';
import { blockSchema } from './schema';
import { Transaction } from './transaction';

export class Block {
	// eslint-disable-next-line no-useless-constructor
	public constructor(public readonly header: BlockHeader, public readonly payload: Transaction[]) {
		// No body necessary
	}

	public static fromBytes(value: Buffer): Block {
		const { header, payload } = codec.decode<{ header: Buffer; payload: Buffer[] }>(
			blockSchema,
			value,
		);

		return new Block(
			BlockHeader.fromBytes(header),
			payload.map(v => Transaction.decode(v)),
		);
	}

	public getBytes(): Buffer {
		return codec.encode(blockSchema, {
			header: this.header.getBytes(),
			payload: this.payload.map(p => p.getBytes()),
		});
	}
}
