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
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { BlockAssetJSON, BlockAssets } from './block_assets';
import { BlockHeader, BlockHeaderJSON } from './block_header';
import { blockSchema } from './schema';
import { Transaction, TransactionJSON } from './transaction';

interface BlockAttrs {
	header: Buffer;
	payload: Buffer[];
	assets: Buffer[];
}

export interface BlockJSON {
	header: BlockHeaderJSON;
	payload: TransactionJSON[];
	assets: BlockAssetJSON[];
}

export class Block {
	// eslint-disable-next-line no-useless-constructor
	public constructor(
		public readonly header: BlockHeader,
		public readonly payload: Transaction[],
		public readonly assets: BlockAssets,
	) {
		// No body necessary
	}

	public static fromBytes(value: Buffer): Block {
		const { header, payload, assets } = codec.decode<BlockAttrs>(blockSchema, value);

		return new Block(
			BlockHeader.fromBytes(header),
			payload.map(v => Transaction.fromBytes(v)),
			BlockAssets.fromBytes(assets),
		);
	}

	public static fromJSON(value: BlockJSON): Block {
		const { header, payload, assets } = value;
		if (typeof header !== 'object') {
			throw new Error('Invalid block format. header must be an object.');
		}
		if (!Array.isArray(payload)) {
			throw new Error('Invalid block format. payload must be an array.');
		}
		if (!Array.isArray(assets)) {
			throw new Error('Invalid block format. assets must be an array.');
		}

		return new Block(
			BlockHeader.fromJSON(value.header as Record<string, unknown>),
			payload.map(v => Transaction.fromJSON(v)),
			BlockAssets.fromJSON(assets),
		);
	}

	public getBytes(): Buffer {
		return codec.encode(blockSchema, {
			header: this.header.getBytes(),
			payload: this.payload.map(p => p.getBytes()),
			assets: this.assets.getBytes(),
		});
	}

	public toJSON(): BlockJSON {
		return {
			header: this.header.toJSON(),
			payload: this.payload.map(p => p.toJSON()),
			assets: this.assets.toJSON(),
		};
	}

	public validate(): void {
		this.header.validate();
		for (const tx of this.payload) {
			tx.validate();
		}
		this.assets.validate();
		if (
			!this.header.transactionRoot?.equals(
				regularMerkleTree.calculateMerkleRootWithLeaves(this.payload.map(tx => tx.id)),
			)
		) {
			throw new Error('Invalid transaction root');
		}

		if (
			!this.header.assetsRoot?.equals(
				regularMerkleTree.calculateMerkleRootWithLeaves(this.assets.getBytes()),
			)
		) {
			throw new Error('Invalid assets root');
		}
	}

	public validateGenesis(): void {
		this.header.validateGenesis();
		if (this.payload.length !== 0) {
			throw new Error('Payload length must be zero');
		}
		this.assets.validateGenesis();
		if (
			!this.header.assetsRoot?.equals(
				regularMerkleTree.calculateMerkleRootWithLeaves(this.assets.getBytes()),
			)
		) {
			throw new Error('Invalid assets root');
		}
	}
}
