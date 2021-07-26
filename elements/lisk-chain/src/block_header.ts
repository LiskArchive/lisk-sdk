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
import { signDataWithPrivateKey, hash } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { TAG_BLOCK_HEADER } from './constants';

export const signingBlockHeaderSchema = {
	$id: '/block/header/signing/2',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
		stateRoot: { dataType: 'bytes', fieldNumber: 5 },
		transactionRoot: { dataType: 'bytes', fieldNumber: 6 },
		generatorAddress: { dataType: 'bytes', fieldNumber: 7 },
		assets: {
			type: 'array',
			fieldNumber: 8,
			items: {
				type: 'object',
				required: ['moduleID', 'data'],
				properties: {
					moduleID: { dataType: 'uint32', fieldNumber: 1 },
					data: { dataType: 'bytes', fieldNumber: 2 },
				},
			},
		},
	},
	required: [
		'version',
		'timestamp',
		'height',
		'previousBlockID',
		'stateRoot',
		'transactionRoot',
		'generatorAddress',
		'assets',
	],
};

export const blockHeaderSchema = {
	...signingBlockHeaderSchema,
	$id: '/block/header/2',
	properties: {
		...signingBlockHeaderSchema.properties,
		signature: { dataType: 'bytes', fieldNumber: 9 },
	},
};

interface BlockHeaderAsset {
	moduleID: number;
	data: Buffer;
}

interface BlockHeaderAttrs {
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly generatorAddress: Buffer;
	readonly previousBlockID: Buffer;
	readonly stateRoot: Buffer;
	readonly transactionRoot: Buffer;
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
	public readonly timestamp: number;
	public readonly height: number;
	public readonly generatorAddress: Buffer;
	public readonly previousBlockID: Buffer;
	public readonly stateRoot: Buffer;
	public readonly transactionRoot: Buffer;
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
		this.timestamp = timestamp;
		this.height = height;
		this.generatorAddress = generatorAddress;
		this.previousBlockID = previousBlockID;
		this.stateRoot = stateRoot;
		this.transactionRoot = transactionRoot;
		this._assets = objects.cloneDeep<BlockHeaderAsset[]>([...assets]);

		this._signature = signature;
		this._id = id;
	}

	public static fromBytes(value: Buffer): BlockHeader {
		return new BlockHeader(codec.decode<BlockHeaderAttrs>(signingBlockHeaderSchema, value));
	}

	public getBytes(): Buffer {
		return codec.encode(blockHeaderSchema, this._getAllProps());
	}

	public toJSON(): BlockHeaderJSON {
		return codec.toJSON(blockHeaderSchema, this._getAllProps());
	}

	public validate(): void {
		// Validate block header
		const errors = validator.validate(blockHeaderSchema, this._getAllProps());
		if (errors.length) {
			throw new LiskValidationError(errors);
		}

		if (this.previousBlockID.length === 0) {
			throw new Error('Previous block id must not be empty');
		}
	}

	public getSigningBytes(): Buffer {
		const blockHeaderBytes = codec.encode(signingBlockHeaderSchema, this._getSigningProps());

		return blockHeaderBytes;
	}

	public sign(key: Buffer, networkIdentifier: Buffer) {
		this._signature = signDataWithPrivateKey(
			TAG_BLOCK_HEADER,
			networkIdentifier,
			this.getSigningBytes(),
			key,
		);

		const blockHeaderBytes = codec.encode(blockHeaderSchema, {
			...this._getSigningProps(),
			signature: this._signature,
			id: Buffer.alloc(0),
		});

		this._id = hash(blockHeaderBytes);

		return this._signature;
	}

	public getAsset(moduleID: number): Buffer | undefined {
		return this._assets.find(a => a.moduleID === moduleID)?.data;
	}

	public setAsset(moduleID: number, value: Buffer): void {
		const asset = this.getAsset(moduleID);
		if (asset) {
			throw new Error(`Module asset for "${moduleID}" is already set.`);
		}

		this._id = undefined;
		this._signature = undefined;

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

	private _getSigningProps() {
		return {
			version: this.version,
			timestamp: this.timestamp,
			height: this.timestamp,
			previousBlockID: this.previousBlockID,
			stateRoot: this.stateRoot,
			transactionRoot: this.transactionRoot,
			generatorAddress: this.generatorAddress,
			assets: this._assets,
		};
	}

	private _getAllProps() {
		return { ...this._getSigningProps(), id: this.id, signature: this.signature };
	}
}
