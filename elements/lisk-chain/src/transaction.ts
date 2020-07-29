/*
 * Copyright © 2019 Lisk Foundation
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
import { hash, getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';

interface TransactionInput {
	readonly moduleType: number;
	readonly assetType: number;
	readonly senderPublicKey: Buffer;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly asset: Buffer;
	readonly signatures: Array<Readonly<Buffer>>;
}

export const transactionSchema = {
	$id: 'lisk/transaction',
	type: 'object',
	required: ['moduleType', 'assetType', 'nonce', 'fee', 'senderPublicKey', 'asset'],
	properties: {
		moduleType: {
			dataType: 'uint32',
			fieldNumber: 1,
			minimum: 2,
		},
		assetType: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		fee: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		senderPublicKey: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
		asset: {
			dataType: 'bytes',
			fieldNumber: 6,
		},
		signatures: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 7,
		},
	},
};

export class Transaction {
	public readonly moduleType: number;
	public readonly assetType: number;
	public readonly asset: Buffer;
	public readonly nonce: bigint;
	public readonly fee: bigint;
	public readonly senderPublicKey: Buffer;
	public readonly signatures: Array<Readonly<Buffer>>;
	private _id?: Buffer;
	private _senderID?: Buffer;

	public constructor(transaction: TransactionInput) {
		this.moduleType = transaction.moduleType;
		this.assetType = transaction.assetType;
		this.asset = transaction.asset;
		this.nonce = transaction.nonce;
		this.fee = transaction.fee;
		this.senderPublicKey = transaction.senderPublicKey;
		this.signatures = transaction.signatures;
	}

	public static decode(bytes: Buffer): Transaction {
		const tx = codec.decode<TransactionInput>(transactionSchema, bytes);
		return new Transaction(tx);
	}

	public get id(): Buffer {
		if (!this._id) {
			this._id = hash(this.getBytes());
		}
		return this._id;
	}

	public get senderID(): Buffer {
		if (!this._senderID) {
			this._senderID = getAddressFromPublicKey(this.senderPublicKey);
		}
		return this._senderID;
	}

	public getBytes(): Buffer {
		const transactionBytes = codec.encode(transactionSchema, this as Record<string, unknown>);

		return transactionBytes;
	}

	public getSigningBytes(): Buffer {
		const transactionBytes = codec.encode(transactionSchema, ({
			...this,
			signatures: [],
		} as unknown) as Record<string, unknown>);

		return transactionBytes;
	}

	public validate(): void {
		// Validate type format
		const schemaErrors = validator.validate(transactionSchema, this);
		if (schemaErrors.length > 0) {
			throw new LiskValidationError(schemaErrors);
		}
	}
}
