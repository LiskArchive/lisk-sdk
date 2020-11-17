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
 *
 */

import {
	signTransaction,
	signMultiSignatureTransaction,
	computeMinFee,
} from '@liskhq/lisk-transactions';
import {
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import {
	decodeTransaction,
	encodeTransaction,
	getTransactionAssetSchema,
	decodeAccount,
} from './codec';
import { Channel, RegisteredSchemas, NodeInfo } from './types';

interface MultiSignatureKeys {
	readonly mandatoryKeys: Buffer[];
	readonly optionalKeys: Buffer[];
	readonly numberOfSignatures: number;
}

export class Transaction {
	private readonly _channel: Channel;
	private readonly _schema: RegisteredSchemas;
	private readonly _nodeInfo: NodeInfo;

	public constructor(channel: Channel, registeredSchema: RegisteredSchemas, nodeInfo: NodeInfo) {
		this._channel = channel;
		this._schema = registeredSchema;
		this._nodeInfo = nodeInfo;
	}

	public async create(
		input: {
			moduleID?: number; // id takes priority
			moduleName?: string;
			assetID?: number; // id takes priority
			assetName?: string;
			fee: bigint;
			nonce: bigint;
			senderPublicKey: Buffer;
			asset: Record<string, unknown>;
			signatures?: Buffer[];
		},
		passphrase: string,
		options?: {
			nonce?: bigint;
			includeSenderSignature?: boolean;
			multisignatureKeys?: {
				mandatoryKeys: Buffer[];
				optionalKeys: Buffer[];
			};
		},
	): Promise<Record<string, unknown>> {
		const txInput = input;
		const networkIdentifier = Buffer.from(this._nodeInfo.networkIdentifier, 'hex');
		const { publicKey, address } = getAddressAndPublicKeyFromPassphrase(passphrase);
		const accountHex = await this._channel.invoke<string>('app:getAccount', {
			address: address.toString('hex'),
		});
		const account = decodeAccount(Buffer.from(accountHex, 'hex'), this._schema);
		if (!txInput.moduleID) {
			if (!txInput.moduleName) {
				throw new Error('Missing moduleID and moduleName');
			}
			const registeredModule = this._nodeInfo.registeredModules.find(
				module => module.name === input.moduleName,
			);
			txInput.moduleID = registeredModule?.id ? registeredModule.id : txInput.moduleID;
		}
		if (typeof txInput.assetID !== 'number') {
			if (!txInput.assetName) {
				throw new Error('Missing assetID and assetName');
			}
			const registeredAsset = this._nodeInfo.registeredModules.find(
				asset => asset.name === input.assetName,
			);
			txInput.assetID = registeredAsset?.id ? registeredAsset.id : txInput.assetID;
		}
		if (!options?.nonce && !txInput.nonce) {
			if (
				typeof account.sequence !== 'object' ||
				!(account.sequence as Record<string, unknown>).nonce
			) {
				throw new Error('Unsupported account type');
			}
			txInput.nonce = (account.sequence as { nonce: bigint }).nonce;
		}
		if (!txInput.senderPublicKey) {
			txInput.senderPublicKey = publicKey;
		}
		// If signature is not set, assign empty array
		txInput.signatures = txInput.signatures ?? [];
		const assetSchema = getTransactionAssetSchema(txInput, this._schema);
		if (account.keys && (account.keys as MultiSignatureKeys).numberOfSignatures > 0) {
			return signMultiSignatureTransaction(
				assetSchema,
				txInput,
				networkIdentifier,
				passphrase,
				account.keys as MultiSignatureKeys,
				options?.includeSenderSignature,
			);
		}
		if (options?.multisignatureKeys && options?.includeSenderSignature) {
			return signMultiSignatureTransaction(
				assetSchema,
				txInput,
				networkIdentifier,
				passphrase,
				options.multisignatureKeys,
				options.includeSenderSignature,
			);
		}
		return signTransaction(assetSchema, txInput, networkIdentifier, passphrase);
	}

	public async get(id: Buffer): Promise<Record<string, unknown>> {
		const transactionHex = await this._channel.invoke<string>('app:getTransactionByID', {
			id: id.toString('hex'),
		});
		return decodeTransaction(Buffer.from(transactionHex, 'hex'), this._schema);
	}

	public async getFromPool(): Promise<Record<string, unknown>[]> {
		const transactionsHex = await this._channel.invoke<string[]>('app:getTransactionsFromPool');
		const decodedTransactions: Record<string, unknown>[] = [];
		for (const transactionHex of transactionsHex) {
			decodedTransactions.push(decodeTransaction(Buffer.from(transactionHex, 'hex'), this._schema));
		}
		return decodedTransactions;
	}

	public async sign(
		transaction: Record<string, unknown>,
		passphrases: string[],
		options?: {
			includeSenderSignature?: boolean;
			multisignatureKeys?: {
				mandatoryKeys: Buffer[];
				optionalKeys: Buffer[];
			};
		},
	): Promise<Record<string, unknown>> {
		const assetSchema = getTransactionAssetSchema(transaction, this._schema);
		const networkIdentifier = Buffer.from(this._nodeInfo.networkIdentifier, 'hex');
		const address = getAddressFromPublicKey(transaction.senderPublicKey as Buffer);
		const accountHex = await this._channel.invoke<string>('app:getAccount', {
			address: address.toString('hex'),
		});
		const account = decodeAccount(Buffer.from(accountHex, 'hex'), this._schema);
		if (account.keys && (account.keys as MultiSignatureKeys).numberOfSignatures > 0) {
			for (const passphrase of passphrases) {
				signMultiSignatureTransaction(
					assetSchema,
					transaction,
					networkIdentifier,
					passphrase,
					account.keys as MultiSignatureKeys,
					options?.includeSenderSignature,
				);
			}
			return transaction;
		}
		if (options?.multisignatureKeys && options?.includeSenderSignature) {
			for (const passphrase of passphrases) {
				signMultiSignatureTransaction(
					assetSchema,
					transaction,
					networkIdentifier,
					passphrase,
					options.multisignatureKeys as MultiSignatureKeys,
					options.includeSenderSignature,
				);
			}
			return transaction;
		}
		return signTransaction(assetSchema, transaction, networkIdentifier, passphrases[0]);
	}

	public async send(transaction: Record<string, unknown>): Promise<void> {
		const encodedTx = encodeTransaction(transaction, this._schema);
		return this._channel.invoke('app:postTransaction', { transaction: encodedTx.toString('hex') });
	}

	public decode(transaction: Buffer): Record<string, unknown> {
		return decodeTransaction(transaction, this._schema);
	}

	public encode(transaction: Record<string, unknown>): Buffer {
		return encodeTransaction(transaction, this._schema);
	}

	public computeMinFee(transaction: Record<string, unknown>): bigint {
		const assetSchema = getTransactionAssetSchema(transaction, this._schema);
		return computeMinFee(assetSchema, transaction);
	}

	public toJSON(transaction: Record<string, unknown>): Record<string, unknown> {
		const { asset: txAsset, ...txRoot } = transaction;
		// We need to do this as our schemas do not include the ID. Keep this.
		const tmpId = txRoot.id;
		delete txRoot.id;

		const schemaAsset = getTransactionAssetSchema(txRoot, this._schema);
		const jsonTxAsset = codec.toJSON(schemaAsset, txAsset as object);
		const jsonTxRoot = codec.toJSON(this._schema.transaction, txRoot);

		const jsonTx = {
			...jsonTxRoot,
			asset: jsonTxAsset,
			id: Buffer.isBuffer(tmpId) ? tmpId.toString('hex') : tmpId,
		};

		return jsonTx;
	}

	public fromJSON(transaction: Record<string, unknown>): Record<string, unknown> {
		const { asset: txAsset, ...txRoot } = transaction;
		// We need to do this as our schemas do not include the ID. Keep this.
		const tmpId = txRoot.id;
		delete txRoot.id;

		const schemaAsset = getTransactionAssetSchema(txRoot, this._schema);
		const txAssetObject = codec.fromJSON(schemaAsset, txAsset as object);
		const txRootObject = codec.fromJSON(this._schema.transaction, txRoot);

		const txObject = {
			...txRootObject,
			asset: txAssetObject,
			id: typeof tmpId === 'string' ? Buffer.from(tmpId, 'hex') : Buffer.alloc(0),
		};

		return txObject;
	}
}
