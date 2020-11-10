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
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import {
	decodeTransaction,
	encodeTransaction,
	getTransactionAssetSchema,
	decodeAccount,
} from './codec';
import { Channel, RegisteredSchemas, NodeInfo } from './types';

export interface CreateTransactionOptions {
	nonce?: bigint;
	includeSenderSignature?: boolean;
	multisignatureKeys?: {
		mandatoryKeys: Buffer[];
		optionalKeys: Buffer[];
	};
}

export interface MultiSignatureKeys {
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
				throw new Error('Missing moduleId and moduleName');
			} else {
				const registeredModule = this._nodeInfo.registeredModules.find(
					module => module.name === input.moduleName,
				);
				txInput.moduleID = registeredModule?.id ? registeredModule.id : txInput.moduleID;
			}
		}
		if (txInput.assetID === undefined || null) {
			if (!txInput.assetName) {
				throw new Error('Missing assetId and assetName');
			} else {
				const registeredAsset = this._nodeInfo.registeredModules.find(
					asset => asset.name === input.assetName,
				);
				txInput.assetID = registeredAsset?.id ? registeredAsset.id : txInput.assetID;
			}
		}
		if (!options?.nonce && !txInput.nonce) {
			if (
				typeof account.sequence !== 'object' ||
				!(account.sequence as Record<string, unknown>).nonce
			) {
				throw new Error('Unspported account type.');
			}
			txInput.nonce = (account.sequence as { nonce: bigint }).nonce;
		}
		if (txInput.senderPublicKey) {
			txInput.senderPublicKey = publicKey;
		}
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
		return this._channel.invoke('app:getTransactionsFromPool');
	}

	public sign(
		transaction: Record<string, unknown>,
		passphrases: string[],
	): Record<string, unknown> {
		const assetSchema = getTransactionAssetSchema(transaction, this._schema);
		const networkIdentifier = Buffer.from(this._nodeInfo.networkIdentifier, 'hex');
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

	public getMinFee(transaction: Record<string, unknown>): bigint {
		const assetSchema = getTransactionAssetSchema(transaction, this._schema);
		return computeMinFee(assetSchema, transaction);
	}
}
