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

import { objects } from '@liskhq/lisk-utils';
import { signDataWithPrivateKey, hash, verifyData } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { TAG_BLOCK_HEADER } from './constants';
import { blockHeaderSchema, blockHeaderSchemaWithId, signingBlockHeaderSchema } from './schema';

export interface BlockHeaderAsset {
	moduleID: number;
	data: Buffer;
}

export interface BlockHeaderAttrs {
	readonly version: number;
	readonly height: number;
	readonly generatorAddress: Buffer;
	readonly previousBlockID: Buffer;
	readonly timestamp: number;
	readonly stateRoot?: Buffer;
	readonly transactionRoot?: Buffer;
	readonly assets: ReadonlyArray<BlockHeaderAsset>;
	signature?: Buffer;
	id?: Buffer;
}

export interface BlockHeaderJSON {
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly generatorAddress: string;
	readonly previousBlockID: string;
	readonly stateRoot: string;
	readonly transactionRoot: string;
	readonly assets: ReadonlyArray<BlockHeaderAsset>;
	readonly signature: string;
	readonly id: string;
}

export class BlockHeader {
	public readonly version: number;
	public readonly height: number;
	public readonly generatorAddress: Buffer;
	public readonly previousBlockID: Buffer;
	public readonly timestamp: number;
	private _stateRoot?: Buffer;
	private _transactionRoot?: Buffer;
	private readonly _assets: BlockHeaderAsset[];
	private _signature?: Buffer;
	private _id?: Buffer;

	public constructor({
		version,
		timestamp,
		height,
		generatorAddress,
		previousBlockID,
		stateRoot,
		transactionRoot,
		signature,
		id,
		assets,
	}: BlockHeaderAttrs) {
		this.version = version;
		this.height = height;
		this.generatorAddress = generatorAddress;
		this.previousBlockID = previousBlockID;
		this.timestamp = timestamp;
		this._stateRoot = stateRoot;
		this._transactionRoot = transactionRoot;
		this._assets = objects.cloneDeep<BlockHeaderAsset[]>([...assets]);

		this._signature = signature;
		this._id = id;
	}

	public static fromBytes(value: Buffer): BlockHeader {
		return new BlockHeader(codec.decode<BlockHeaderAttrs>(blockHeaderSchema, value));
	}

	public static fromJSON(value: Record<string, unknown>): BlockHeader {
		return new BlockHeader(codec.fromJSON<BlockHeaderAttrs>(blockHeaderSchema, value));
	}

	public get stateRoot() {
		return this._stateRoot;
	}

	public set stateRoot(val) {
		this._stateRoot = val;
		this._resetComputedValues();
	}

	public get transactionRoot() {
		return this._transactionRoot;
	}

	public set transactionRoot(val) {
		this._transactionRoot = val;
		this._resetComputedValues();
	}

	public getBytes(): Buffer {
		return codec.encode(blockHeaderSchema, this._getBlockHeaderProps());
	}

	public toJSON(): BlockHeaderJSON {
		return codec.toJSON(blockHeaderSchemaWithId, this._getAllProps());
	}

	public toObject(): BlockHeaderAttrs {
		return this._getAllProps();
	}

	public validate(): void {
		const errors = validator.validate(blockHeaderSchema, this._getBlockHeaderProps());
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		if (this.previousBlockID.length === 0) {
			throw new Error('Previous block id must not be empty.');
		}
	}

	public validateSignature(publicKey: Buffer, networkIdentifier: Buffer): void {
		const signingBytes = this.getSigningBytes();
		const verified = verifyData(
			TAG_BLOCK_HEADER,
			networkIdentifier,
			signingBytes,
			this.signature,
			publicKey,
		);

		if (!verified) {
			throw new Error('Invalid block signature.');
		}
	}

	public getSigningBytes(): Buffer {
		const blockHeaderBytes = codec.encode(signingBlockHeaderSchema, this._getSigningProps());

		return blockHeaderBytes;
	}

	public sign(networkIdentifier: Buffer, privateKey: Buffer): void {
		this._signature = signDataWithPrivateKey(
			TAG_BLOCK_HEADER,
			networkIdentifier,
			this.getSigningBytes(),
			privateKey,
		);
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
		this._resetComputedValues();
	}

	public get signature(): Buffer {
		if (!this._signature) {
			throw new Error('Block header is not signed.');
		}

		return this._signature;
	}

	public get id(): Buffer {
		if (!this._id && !this._signature) {
			throw new Error('Can not generate the id for unsigned block header.');
		}

		if (!this._id) {
			const blockHeaderBytes = codec.encode(blockHeaderSchema, {
				...this._getSigningProps(),
				signature: this._signature,
			});

			this._id = hash(blockHeaderBytes);
		}

		return this._id;
	}

	private _resetComputedValues() {
		this._id = undefined;
		this._signature = undefined;
	}

	private _getSigningProps() {
		return {
			version: this.version,
			timestamp: this.timestamp,
			height: this.height,
			previousBlockID: this.previousBlockID,
			stateRoot: this.stateRoot,
			transactionRoot: this.transactionRoot,
			generatorAddress: this.generatorAddress,
			assets: this._assets,
		};
	}

	private _getBlockHeaderProps() {
		return {
			...this._getSigningProps(),
			signature: this.signature,
		};
	}

	private _getAllProps() {
		return {
			...this._getBlockHeaderProps(),
			id: this.id,
		};
	}
}
