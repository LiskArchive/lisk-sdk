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

import { signDataWithPrivateKey, hash, verifyData } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { EMPTY_BUFFER, EMPTY_HASH, SIGNATURE_LENGTH_BYTES, TAG_BLOCK_HEADER } from './constants';
import { blockHeaderSchema, blockHeaderSchemaWithId, signingBlockHeaderSchema } from './schema';
import { JSONObject } from './types';

export interface BlockHeaderAttrs {
	readonly version: number;
	readonly height: number;
	readonly generatorAddress: Buffer;
	readonly previousBlockID: Buffer;
	readonly timestamp: number;
	readonly maxHeightPrevoted: number;
	readonly maxHeightGenerated: number;
	readonly aggregateCommit: {
		readonly height: number;
		readonly aggregationBits: Buffer;
		readonly certificateSignature: Buffer;
	};
	readonly validatorsHash?: Buffer;
	readonly stateRoot?: Buffer;
	readonly transactionRoot?: Buffer;
	readonly assetsRoot?: Buffer;
	readonly eventRoot?: Buffer;
	signature?: Buffer;
	id?: Buffer;
}

export type BlockHeaderJSON = JSONObject<BlockHeaderAttrs>;

export class BlockHeader {
	public readonly version: number;
	public readonly height: number;
	public readonly generatorAddress: Buffer;
	public readonly previousBlockID: Buffer;
	public readonly timestamp: number;
	public readonly maxHeightPrevoted: number;
	public readonly maxHeightGenerated: number;
	private _aggregateCommit: {
		height: number;
		aggregationBits: Buffer;
		certificateSignature: Buffer;
	};
	private _validatorsHash?: Buffer;
	private _stateRoot?: Buffer;
	private _transactionRoot?: Buffer;
	private _assetsRoot?: Buffer;
	private _eventRoot?: Buffer;
	private _signature?: Buffer;
	private _id?: Buffer;

	public constructor({
		version,
		timestamp,
		height,
		generatorAddress,
		previousBlockID,
		maxHeightPrevoted,
		maxHeightGenerated,
		aggregateCommit,
		validatorsHash,
		stateRoot,
		eventRoot,
		assetsRoot,
		transactionRoot,
		signature,
		id,
	}: BlockHeaderAttrs) {
		this.version = version;
		this.height = height;
		this.generatorAddress = generatorAddress;
		this.previousBlockID = previousBlockID;
		this.timestamp = timestamp;
		this.maxHeightPrevoted = maxHeightPrevoted;
		this.maxHeightGenerated = maxHeightGenerated;
		this._aggregateCommit = aggregateCommit;
		this._validatorsHash = validatorsHash;
		this._eventRoot = eventRoot;
		this._stateRoot = stateRoot;
		this._transactionRoot = transactionRoot;
		this._assetsRoot = assetsRoot;

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

	public get eventRoot() {
		return this._eventRoot;
	}

	public set eventRoot(val) {
		this._eventRoot = val;
		this._resetComputedValues();
	}

	public get assetsRoot() {
		return this._assetsRoot;
	}

	public set assetsRoot(val) {
		this._assetsRoot = val;
		this._resetComputedValues();
	}

	public get transactionRoot() {
		return this._transactionRoot;
	}

	public set transactionRoot(val) {
		this._transactionRoot = val;
		this._resetComputedValues();
	}

	public get validatorsHash() {
		return this._validatorsHash;
	}

	public set validatorsHash(val) {
		this._validatorsHash = val;
		this._resetComputedValues();
	}

	public get aggregateCommit() {
		return this._aggregateCommit;
	}

	public set aggregateCommit(val) {
		this._aggregateCommit = val;
		this._resetComputedValues();
	}

	public getBytes(): Buffer {
		return codec.encode(blockHeaderSchema, this._getBlockHeaderProps());
	}

	public toJSON(): BlockHeaderJSON {
		return codec.toJSON(blockHeaderSchemaWithId, this._getAllProps());
	}

	public toObject(): Required<BlockHeaderAttrs> {
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
		if (this.signature.length !== SIGNATURE_LENGTH_BYTES) {
			throw new Error('Signature length must be 64 bytes.');
		}
	}

	public validateGenesis(): void {
		const header = this._getBlockHeaderProps();
		const errors = validator.validate(blockHeaderSchema, header);

		if (header.previousBlockID.length !== 32) {
			errors.push({
				message: 'Genesis block header previousBlockID must be 32 bytes',
				keyword: 'const',
				dataPath: 'header.previousBlockID',
				schemaPath: 'properties.previousBlockID',
				params: {},
			});
		}

		if (!header.transactionRoot.equals(EMPTY_HASH)) {
			errors.push({
				message: 'Genesis block header transaction root must be empty hash',
				keyword: 'const',
				dataPath: 'header.transactionRoot',
				schemaPath: 'properties.transactionRoot',
				params: { allowedValue: EMPTY_HASH },
			});
		}

		if (!header.generatorAddress.equals(EMPTY_BUFFER)) {
			errors.push({
				message: 'Genesis block header generatorAddress must be empty bytes',
				keyword: 'const',
				dataPath: 'header.generatorAddress',
				schemaPath: 'properties.generatorAddress',
				params: { allowedValue: EMPTY_BUFFER },
			});
		}

		if (header.maxHeightPrevoted !== header.height) {
			errors.push({
				message: 'Genesis block header maxHeightPrevoted must equal height',
				keyword: 'const',
				dataPath: 'header.maxHeightPrevoted',
				schemaPath: 'properties.maxHeightPrevoted',
				params: { allowedValue: header.height },
			});
		}

		if (header.maxHeightGenerated !== 0) {
			errors.push({
				message: 'Genesis block header maxHeightGenerated must equal 0',
				keyword: 'const',
				dataPath: 'header.maxHeightGenerated',
				schemaPath: 'properties.maxHeightGenerated',
				params: { allowedValue: 0 },
			});
		}

		if (header.aggregateCommit.height !== 0) {
			errors.push({
				message: 'Genesis block header aggregateCommit.height must equal 0',
				keyword: 'const',
				dataPath: 'aggregateCommit.height',
				schemaPath: 'properties.aggregateCommit.height',
				params: { allowedValue: 0 },
			});
		}

		if (!header.aggregateCommit.certificateSignature.equals(EMPTY_BUFFER)) {
			errors.push({
				message: 'Genesis block header aggregateCommit.certificateSignature must be empty bytes',
				keyword: 'const',
				dataPath: 'aggregateCommit.certificateSignature',
				schemaPath: 'properties.aggregateCommit.certificateSignature',
				params: { allowedValue: EMPTY_BUFFER },
			});
		}

		if (!header.aggregateCommit.aggregationBits.equals(EMPTY_BUFFER)) {
			errors.push({
				message: 'Genesis block header aggregateCommit.aggregationBits must be empty bytes',
				keyword: 'const',
				dataPath: 'aggregateCommit.aggregationBits',
				schemaPath: 'properties.aggregateCommit.aggregationBits',
				params: { allowedValue: EMPTY_BUFFER },
			});
		}

		if (!header.signature.equals(EMPTY_BUFFER)) {
			errors.push({
				message: 'Genesis block header signature must be empty bytes',
				keyword: 'const',
				dataPath: 'header.signature',
				schemaPath: 'properties.signature',
				params: { allowedValue: EMPTY_BUFFER },
			});
		}

		if (errors.length) {
			throw new LiskValidationError(errors);
		}
	}

	public validateSignature(publicKey: Buffer, networkIdentifier: Buffer): void {
		const signingBytes = this.getSigningBytes();
		const valid = verifyData(
			TAG_BLOCK_HEADER,
			networkIdentifier,
			signingBytes,
			this.signature,
			publicKey,
		);

		if (!valid) {
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
	}

	private _getSigningProps() {
		if (!this.assetsRoot) {
			throw new Error('Asset root is empty.');
		}
		if (!this.eventRoot) {
			throw new Error('Event root is empty.');
		}
		if (!this.stateRoot) {
			throw new Error('State root is empty.');
		}
		if (!this.transactionRoot) {
			throw new Error('Transaction root is empty.');
		}
		if (!this.validatorsHash) {
			throw new Error('Validators hash is empty.');
		}
		return {
			version: this.version,
			timestamp: this.timestamp,
			height: this.height,
			previousBlockID: this.previousBlockID,
			stateRoot: this.stateRoot,
			assetsRoot: this.assetsRoot,
			eventRoot: this.eventRoot,
			transactionRoot: this.transactionRoot,
			validatorsHash: this.validatorsHash,
			aggregateCommit: this.aggregateCommit,
			generatorAddress: this.generatorAddress,
			maxHeightPrevoted: this.maxHeightPrevoted,
			maxHeightGenerated: this.maxHeightGenerated,
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
