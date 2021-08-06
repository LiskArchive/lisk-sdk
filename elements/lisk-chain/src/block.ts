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

interface BlockAttrs {
	header: Buffer;
	payload: Buffer[];
}

export class Block {
	// eslint-disable-next-line no-useless-constructor
	public constructor(public readonly header: BlockHeader, public readonly payload: Transaction[]) {
		// No body necessary
	}

	public static fromBytes(value: Buffer): Block {
		const { header, payload } = codec.decode<BlockAttrs>(blockSchema, value);

		return new Block(
			BlockHeader.fromBytes(header),
			payload.map(v => Transaction.fromBytes(v)),
		);
	}

	public static fromJSON(value: Record<string, unknown>): Block {
		const { header, payload } = value;
		if (typeof header !== 'object') {
			throw new Error('Invalid block format. header must be an object.');
		}
		if (!Array.isArray(payload)) {
			throw new Error('Invalid block format. payload must be an array.');
		}

		return new Block(
			BlockHeader.fromJSON(value.header as Record<string, unknown>),
			payload.map(v => Transaction.fromBytes(v)),
		);
	}

	public getBytes(): Buffer {
		return codec.encode(blockSchema, {
			header: this.header.getBytes(),
			payload: this.payload.map(p => p.getBytes()),
		});
	}

	public validate(): void {
		this.header.validate();
		for (const tx of this.payload) {
			tx.validate();
		}
	}
}
