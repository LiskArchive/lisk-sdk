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

import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { MerkleTree } from '@liskhq/lisk-tree';
import { blockAssetSchema } from './schema';
import { MAX_ASSET_DATA_SIZE_BYTES } from './constants';
import { JSONObject } from './types';

export interface BlockAsset {
	moduleID: Buffer;
	data: Buffer;
}

export type BlockAssetJSON = JSONObject<BlockAsset>;

export class BlockAssets {
	private readonly _assets: BlockAsset[] = [];
	private _assetRoot!: Buffer;

	public constructor(assets: BlockAsset[] = []) {
		this._assets = assets;
	}

	public static fromBytes(values: ReadonlyArray<Buffer>): BlockAssets {
		const assets = values.map(val => codec.decode<BlockAsset>(blockAssetSchema, val));
		const blockAssets = new BlockAssets(assets);
		return blockAssets;
	}

	public static fromJSON(values: Record<string, unknown>[]): BlockAssets {
		const assets = values.map(val => codec.fromJSON<BlockAsset>(blockAssetSchema, val));
		return new BlockAssets(assets);
	}

	public async getRoot(): Promise<Buffer> {
		this._assetRoot = await this._calculateRoot();

		return this._assetRoot;
	}

	public getBytes(): Buffer[] {
		return this._assets.map(asset => codec.encode(blockAssetSchema, asset));
	}

	public getAsset(moduleID: Buffer): Buffer | undefined {
		return this._assets.find(a => a.moduleID === moduleID)?.data;
	}

	public getAll(): BlockAsset[] {
		return [...this._assets];
	}

	public toJSON(): BlockAssetJSON[] {
		return this._assets.map(asset => ({
			moduleID: asset.moduleID.toString('hex'),
			data: asset.data.toString('hex'),
		}));
	}

	public setAsset(moduleID: Buffer, value: Buffer): void {
		const asset = this.getAsset(moduleID);
		if (asset) {
			throw new Error(`Module asset for "${moduleID.readInt32BE(0)}" is already set.`);
		}

		this._assets.push({ moduleID, data: value });
	}

	public sort(): void {
		this._assets.sort((a1, a2) => a1.moduleID.readInt32BE(0) - a2.moduleID.readInt32BE(0));
	}

	public validate(): void {
		let last = this._assets[0];
		let i = 0;
		for (const asset of this._assets) {
			const errors = validator.validate(blockAssetSchema, asset);
			if (errors.length) {
				throw new LiskValidationError(errors);
			}
			// Data size of each module should not be greater than max asset data size
			if (asset.data.byteLength > MAX_ASSET_DATA_SIZE_BYTES) {
				throw new Error(
					`Module with ID ${asset.moduleID.readInt32BE(
						0,
					)} has data size more than ${MAX_ASSET_DATA_SIZE_BYTES} bytes.`,
				);
			}
			if (last.moduleID > asset.moduleID) {
				throw new Error('Assets are not sorted in the increasing values of moduleID.');
			}
			// Check for duplicates
			if (i > 0 && asset.moduleID.equals(last.moduleID)) {
				throw new Error(
					`Module with ID ${this._assets[i].moduleID.readInt32BE(0)} has duplicate entries.`,
				);
			}
			i += 1;
			last = asset;
		}
	}

	public validateGenesis(): void {
		let last = this._assets[0];
		let i = 0;
		for (const asset of this._assets) {
			const errors = validator.validate(blockAssetSchema, asset);
			if (errors.length) {
				throw new LiskValidationError(errors);
			}
			if (last.moduleID > asset.moduleID) {
				throw new Error('Assets are not sorted in the increasing values of moduleID.');
			}
			if (i > 0 && asset.moduleID.equals(last.moduleID)) {
				throw new Error(
					`Module with ID ${this._assets[i].moduleID.readInt32BE(0)} has duplicate entries.`,
				);
			}
			i += 1;
			last = asset;
		}
	}

	private async _calculateRoot(): Promise<Buffer> {
		const merkleTree = new MerkleTree();
		await merkleTree.init(this.getBytes());

		return merkleTree.root;
	}
}
