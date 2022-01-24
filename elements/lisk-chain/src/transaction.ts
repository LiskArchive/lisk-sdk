/*
 * Copyright © 2020 Lisk Foundation
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
import { hash, getAddressFromPublicKey, signDataWithPrivateKey } from '@liskhq/lisk-cryptography';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { TAG_TRANSACTION } from './constants';
import { JSONObject } from './types';

export interface TransactionAttrs {
	readonly moduleID: number;
	readonly commandID: number;
	readonly senderPublicKey: Buffer;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly params: Buffer;
	readonly signatures: ReadonlyArray<Buffer>;
	readonly id?: Buffer;
}
export type TransactionJSON = JSONObject<TransactionAttrs>;

export const transactionSchema = {
	$id: 'lisk/transaction',
	type: 'object',
	required: ['moduleID', 'commandID', 'nonce', 'fee', 'senderPublicKey', 'params'],
	properties: {
		moduleID: {
			dataType: 'uint32',
			fieldNumber: 1,
			minimum: 2,
		},
		commandID: {
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
			minLength: 32,
			maxLength: 32,
		},
		params: {
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

export const calculateMinFee = (
	tx: Transaction,
	minFeePerByte: number,
	baseFees: { moduleID: number; commandID: number; baseFee: string }[],
): bigint => {
	const size = tx.getBytes().length;
	const baseFee =
		baseFees.find(bf => bf.moduleID === tx.moduleID && bf.commandID === tx.commandID)?.baseFee ??
		'0';
	return BigInt(minFeePerByte * size) + BigInt(baseFee);
};

export class Transaction {
	public readonly moduleID: number;
	public readonly commandID: number;
	public readonly params: Buffer;
	public readonly nonce: bigint;
	public readonly fee: bigint;
	public readonly senderPublicKey: Buffer;
	public readonly signatures: Buffer[];
	private _id?: Buffer;
	private _senderAddress?: Buffer;

	public constructor(transaction: TransactionAttrs) {
		this.moduleID = transaction.moduleID;
		this.commandID = transaction.commandID;
		this.params = transaction.params;
		this.nonce = transaction.nonce;
		this.fee = transaction.fee;
		this.senderPublicKey = transaction.senderPublicKey;
		this.signatures = [...transaction.signatures];
	}

	public static fromBytes(bytes: Buffer): Transaction {
		const tx = codec.decode<TransactionAttrs>(transactionSchema, bytes);
		return new Transaction(tx);
	}

	public static fromJSON(value: TransactionJSON): Transaction {
		const tx = codec.fromJSON<TransactionAttrs>(transactionSchema, value);
		return new Transaction(tx);
	}

	public get id(): Buffer {
		if (!this._id) {
			this._id = hash(this.getBytes());
		}
		return this._id;
	}

	public get senderAddress(): Buffer {
		if (!this._senderAddress) {
			this._senderAddress = getAddressFromPublicKey(this.senderPublicKey);
		}
		return this._senderAddress;
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

	public sign(networkIdentifier: Buffer, privateKey: Buffer): void {
		const signature = signDataWithPrivateKey(
			TAG_TRANSACTION,
			networkIdentifier,
			this.getSigningBytes(),
			privateKey,
		);
		this.signatures.push(signature);
	}

	public validate(): void {
		const schemaErrors = validator.validate(transactionSchema, this);
		if (schemaErrors.length > 0) {
			throw new LiskValidationError(schemaErrors);
		}
		if (this.signatures.length === 0) {
			throw new Error('Signatures must not be empty');
		}
		for (const signature of this.signatures) {
			if (signature.length !== 0 && signature.length !== 64) {
				throw new Error('Signature must be empty or 64 bytes');
			}
		}
	}

	public toJSON(): JSONObject<TransactionAttrs> {
		return codec.toJSON(transactionSchema, this._getProps());
	}

	public toObject(): TransactionAttrs {
		return this._getProps();
	}

	private _getProps() {
		return {
			moduleID: this.moduleID,
			commandID: this.commandID,
			params: this.params,
			nonce: this.nonce,
			fee: this.fee,
			senderPublicKey: this.senderPublicKey,
			signatures: this.signatures,
			id: this._id,
		};
	}
}
