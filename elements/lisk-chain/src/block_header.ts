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

import { signDataWithPrivateKey } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { blockHeaderSchema } from './schema';
import { TAG_BLOCK_HEADER } from './constants';

interface BlockHeaderAttrs {
	readonly generatorAddress: Buffer;
	readonly previousBlockID: Buffer;
	readonly timestamp: number;
	readonly stateRoot: Buffer;
	readonly transactionRoot: Buffer;
	readonly version: number;
	readonly assets: ReadonlyArray<{ moduleID: number; data: Buffer }>;
	signature?: Buffer;
	id?: Buffer;
}

export interface BlockHeaderJSON {
	readonly generatorAddress: string;
	readonly previousBlockID: string;
	readonly timestamp: number;
	readonly stateRoot: string;
	readonly transactionRoot: string;
	readonly version: number;
	readonly assets: ReadonlyArray<{ moduleID: number; data: string }>;
	readonly signature: string;
	readonly id: string;
}

export class BlockHeader {
	public readonly generatorAddress: Buffer;
	public readonly version: number;
	public readonly previousBlockID: Buffer;
	public readonly timestamp: number;
	public readonly stateRoot: Buffer;
	public readonly transactionRoot: Buffer;

	private readonly _assets: { moduleID: number; data: Buffer }[];
	private _signature?: Buffer;
	private _id?: Buffer;

	public constructor({
		version,
		generatorAddress,
		previousBlockID,
		timestamp,
		stateRoot,
		transactionRoot,
		signature,
		id,
		assets,
	}: BlockHeaderAttrs) {
		this.version = version;
		this.generatorAddress = generatorAddress;
		this.previousBlockID = previousBlockID;
		this.timestamp = timestamp;
		this.stateRoot = stateRoot;
		this.transactionRoot = transactionRoot;
		this._assets = [...assets];

		this._signature = signature;
		this._id = id;
	}

	public static fromBytes(value: Buffer): BlockHeader {
		return new BlockHeader(codec.decode<BlockHeaderAttrs>(blockHeaderSchema, value));
	}

	public getBytes(): Buffer {
		return codec.encode(blockHeaderSchema, this._getBlockHeaderProps());
	}

	public toJSON(): BlockHeaderJSON {
		return codec.toJSON(blockHeaderSchema, this._getBlockHeaderProps());
	}

	public validate(): void {
		const headerWithoutAsset = {
			...this._getBlockHeaderProps(),
			asset: Buffer.alloc(0),
		};
		// Validate block header
		const errors = validator.validate(blockHeaderSchema, headerWithoutAsset);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}

		if (this.previousBlockID.length === 0) {
			throw new Error('Previous block id must not be empty');
		}
	}

	public getSigningBytes(): Buffer {
		const blockHeaderBytes = codec.encode(blockHeaderSchema, ({
			...this,
			signature: Buffer.alloc(0),
		} as unknown) as Record<string, unknown>);

		return blockHeaderBytes;
	}

	public sign(key: Buffer, networkIdentifier: Buffer) {
		return signDataWithPrivateKey(TAG_BLOCK_HEADER, networkIdentifier, this.getSigningBytes(), key);
	}

	public getAsset(moduleID: number): Buffer | undefined {
		return this._assets.find(a => a.moduleID === moduleID)?.data;
	}
	public setAsset(moduleID: number, value: Buffer): void {
		const asset = this.getAsset(moduleID);
		if (asset) {
			throw new Error(`Module asset for "${moduleID}" is already set.`);
		}

		this._assets.push({ moduleID, data: value });
	}

	public get signature(): Buffer {
		if (!this._signature) {
			// TODO: Calculate block id
			this._signature = Buffer.alloc(0);
		}

		return this._signature;
	}

	public get id(): Buffer {
		if (!this._id) {
			// TODO: Calculate block id
			this._id = Buffer.alloc(0);
		}

		return this._id;
	}

	private _getBlockHeaderProps() {
		return {
			id: this.id,
			signature: this.signature,
			version: this.version,
			generatorAddress: this.generatorAddress,
			previousBlockID: this.previousBlockID,
			timestamp: this.timestamp,
			stateRoot: this.stateRoot,
			transactionRoot: this.transactionRoot,
			assets: this._assets,
		};
	}
}
