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
import { address, ed, utils } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { NAME_REGEX, TAG_TRANSACTION, MAX_PARAMS_SIZE } from './constants';
import { JSONObject } from './types';

export interface TransactionAttrs {
	readonly module: string;
	readonly command: string;
	readonly senderPublicKey: Buffer;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly params: Buffer;
	readonly signatures: ReadonlyArray<Buffer>;
	readonly id?: Buffer;
}
export type TransactionJSON = JSONObject<TransactionAttrs> & { id: string };

export const transactionSchema = {
	$id: '/lisk/transaction',
	type: 'object',
	required: ['module', 'command', 'nonce', 'fee', 'senderPublicKey', 'params'],
	properties: {
		module: {
			dataType: 'string',
			fieldNumber: 1,
			minLength: 1,
			maxLength: 32,
		},
		command: {
			dataType: 'string',
			fieldNumber: 2,
			minLength: 1,
			maxLength: 32,
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

export class Transaction {
	public readonly module: string;
	public readonly command: string;
	public readonly params: Buffer;
	public readonly nonce: bigint;
	public readonly fee: bigint;
	public readonly senderPublicKey: Buffer;
	public readonly signatures: Buffer[];
	private _id?: Buffer;
	private _senderAddress?: Buffer;

	public constructor(transaction: TransactionAttrs) {
		this.module = transaction.module;
		this.command = transaction.command;
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
			this._id = utils.hash(this.getBytes());
		}
		return this._id;
	}

	public get senderAddress(): Buffer {
		if (!this._senderAddress) {
			this._senderAddress = address.getAddressFromPublicKey(this.senderPublicKey);
		}
		return this._senderAddress;
	}

	public getBytes(): Buffer {
		return codec.encode(transactionSchema, this as Record<string, unknown>);
	}

	public getSigningBytes(): Buffer {
		const transactionBytes = codec.encode(transactionSchema, {
			...this,
			signatures: [],
		} as unknown as Record<string, unknown>);

		return transactionBytes;
	}

	public sign(chainID: Buffer, privateKey: Buffer): void {
		const signature = ed.signDataWithPrivateKey(
			TAG_TRANSACTION,
			chainID,
			this.getSigningBytes(),
			privateKey,
		);
		this.signatures.push(signature);
	}

	public validate(): void {
		validator.validate(transactionSchema, this);
		if (!NAME_REGEX.test(this.module)) {
			throw new Error(`Invalid module name ${this.module}`);
		}
		if (!NAME_REGEX.test(this.command)) {
			throw new Error(`Invalid command name ${this.command}`);
		}

		if (this.params.length > MAX_PARAMS_SIZE) {
			throw new Error(`Params exceeds max size allowed ${MAX_PARAMS_SIZE}.`);
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

	public toJSON(): TransactionJSON {
		return { ...codec.toJSON(transactionSchema, this._getProps()), id: this.id.toString('hex') };
	}

	public toObject(): TransactionAttrs {
		return this._getProps();
	}

	private _getProps() {
		return {
			module: this.module,
			command: this.command,
			params: this.params,
			nonce: this.nonce,
			fee: this.fee,
			senderPublicKey: this.senderPublicKey,
			signatures: this.signatures,
			id: this._id,
		};
	}
}
