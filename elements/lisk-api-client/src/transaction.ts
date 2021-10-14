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
import { decodeTransaction, encodeTransaction, getTransactionParamsSchema } from './codec';
import { Channel, RegisteredSchemas, NodeInfo } from './types';

interface MultiSignatureKeys {
	readonly mandatoryKeys: Buffer[];
	readonly optionalKeys: Buffer[];
	readonly numberOfSignatures: number;
}

interface BaseFee {
	readonly moduleID: number;
	readonly commandID: number;
	readonly baseFee: string;
}

interface Options {
	readonly minFeePerByte: number;
	readonly baseFees: BaseFee[];
	readonly numberOfSignatures: number;
}

interface AuthAccount {
	nonce: string;
	mandatoryKeys: string[];
	optionalKeys: string[];
	numberOfSignatures: number;
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
			commandID?: number; // id takes priority
			commandName?: string;
			fee: bigint;
			nonce?: bigint;
			senderPublicKey?: Buffer;
			params: Record<string, unknown>;
			signatures?: Buffer[];
		},
		passphrase: string,
		options?: {
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
		let authAccount: AuthAccount | undefined;
		try {
			authAccount = await this._channel.invoke<AuthAccount>('auth_getAuthAccount', {
				address: address.toString('hex'),
			});
		} catch (error) {
			throw new Error('Auth module is not registered or does not have "getAuthAccount" endpoint.');
		}

		if (!txInput.moduleID) {
			if (!txInput.moduleName) {
				throw new Error('Missing moduleID and moduleName');
			}
			const registeredModule = this._nodeInfo.registeredModules.find(
				module => module.name === input.moduleName,
			);
			if (!registeredModule) {
				throw new Error(`Module corresponding to name ${txInput.moduleName} not registered.`);
			}
			txInput.moduleID = registeredModule.id;
		}
		if (typeof txInput.commandID !== 'number') {
			if (!txInput.commandName) {
				throw new Error('Missing commandID and commandName');
			}
			const registeredModule = this._nodeInfo.registeredModules.find(
				m => m.id === txInput.moduleID,
			);
			if (!registeredModule) {
				throw new Error(`Module corresponding to id ${txInput.moduleID} not registered.`);
			}
			const registeredCommand = registeredModule.commands.find(
				command => command.name === txInput.commandName,
			);
			if (!registeredCommand) {
				throw new Error(`Command corresponding to name ${txInput.commandName} not registered.`);
			}
			txInput.commandID = registeredCommand.id;
		}
		if (typeof txInput.nonce !== 'bigint') {
			txInput.nonce = BigInt(authAccount.nonce);
		}
		if (txInput.nonce < BigInt(0)) {
			throw new Error('Nonce must be greater or equal to zero');
		}
		if (!txInput.senderPublicKey) {
			txInput.senderPublicKey = publicKey;
		}
		// If signature is not set, assign empty array
		txInput.signatures = txInput.signatures ?? [];
		const commandSchema = getTransactionParamsSchema(txInput, this._schema);
		if (authAccount.numberOfSignatures > 0) {
			return signMultiSignatureTransaction(
				commandSchema,
				txInput,
				networkIdentifier,
				passphrase,
				{
					mandatoryKeys: authAccount.mandatoryKeys.map(k => Buffer.from(k, 'hex')),
					optionalKeys: authAccount.optionalKeys.map(k => Buffer.from(k, 'hex')),
				},
				options?.includeSenderSignature,
			);
		}
		if (options?.multisignatureKeys && options?.includeSenderSignature) {
			return signMultiSignatureTransaction(
				commandSchema,
				txInput,
				networkIdentifier,
				passphrase,
				options.multisignatureKeys,
				options.includeSenderSignature,
			);
		}
		return signTransaction(commandSchema, txInput, networkIdentifier, passphrase);
	}

	public async get(id: Buffer | string): Promise<Record<string, unknown>> {
		const idString: string = Buffer.isBuffer(id) ? id.toString('hex') : id;
		const transactionHex = await this._channel.invoke<string>('app_getTransactionByID', {
			id: idString,
		});
		return decodeTransaction(Buffer.from(transactionHex, 'hex'), this._schema);
	}

	public async getFromPool(): Promise<Record<string, unknown>[]> {
		const transactionsHex = await this._channel.invoke<string[]>('app_getTransactionsFromPool');
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
		const commandSchema = getTransactionParamsSchema(transaction, this._schema);
		const networkIdentifier = Buffer.from(this._nodeInfo.networkIdentifier, 'hex');
		const address = getAddressFromPublicKey(transaction.senderPublicKey as Buffer);
		const authAccount = await this._channel.invoke<AuthAccount>('auth_getAuthAccount', {
			address: address.toString('hex'),
		});
		if (authAccount.numberOfSignatures > 0) {
			for (const passphrase of passphrases) {
				signMultiSignatureTransaction(
					commandSchema,
					transaction,
					networkIdentifier,
					passphrase,
					{
						mandatoryKeys: authAccount.mandatoryKeys.map(k => Buffer.from(k, 'hex')),
						optionalKeys: authAccount.optionalKeys.map(k => Buffer.from(k, 'hex')),
					},
					options?.includeSenderSignature,
				);
			}
			return transaction;
		}
		if (options?.multisignatureKeys && options?.includeSenderSignature) {
			for (const passphrase of passphrases) {
				signMultiSignatureTransaction(
					commandSchema,
					transaction,
					networkIdentifier,
					passphrase,
					options.multisignatureKeys as MultiSignatureKeys,
					options.includeSenderSignature,
				);
			}
			return transaction;
		}
		return signTransaction(commandSchema, transaction, networkIdentifier, passphrases[0]);
	}

	public async send(
		transaction: Record<string, unknown>,
	): Promise<{
		transactionId: string;
	}> {
		const encodedTx = encodeTransaction(transaction, this._schema);
		return this._channel.invoke<{
			transactionId: string;
		}>('app_postTransaction', { transaction: encodedTx.toString('hex') });
	}

	public decode<T = Record<string, unknown>>(transaction: Buffer | string): T {
		const transactionBuffer: Buffer = Buffer.isBuffer(transaction)
			? transaction
			: Buffer.from(transaction, 'hex');
		return decodeTransaction(transactionBuffer, this._schema) as T;
	}

	public encode(transaction: Record<string, unknown>): Buffer {
		return encodeTransaction(transaction, this._schema);
	}

	public computeMinFee(transaction: Record<string, unknown>): bigint {
		const commandSchema = getTransactionParamsSchema(transaction, this._schema);
		const numberOfSignatures = transaction.signatures
			? (transaction.signatures as string[]).length
			: 1;
		const options: Options = {
			minFeePerByte: this._nodeInfo.genesisConfig.minFeePerByte,
			baseFees: this._nodeInfo.genesisConfig.baseFees,
			numberOfSignatures,
		};

		return computeMinFee(commandSchema, transaction, options);
	}

	public toJSON(transaction: Record<string, unknown>): Record<string, unknown> {
		const { params: txParams, ...txRoot } = transaction;
		// We need to do this as our schemas do not include the ID. Keep this.
		const tmpId = txRoot.id;
		delete txRoot.id;

		const schemaParams = getTransactionParamsSchema(txRoot, this._schema);
		const jsonTxParams = codec.toJSON(schemaParams, txParams as Record<string, unknown>);
		const jsonTxRoot = codec.toJSON(this._schema.transaction, txRoot);

		const jsonTx = {
			...jsonTxRoot,
			params: jsonTxParams,
			id: Buffer.isBuffer(tmpId) ? tmpId.toString('hex') : tmpId,
		};

		return jsonTx;
	}

	public fromJSON(transaction: Record<string, unknown>): Record<string, unknown> {
		const { params: txParams, ...txRoot } = transaction;
		// We need to do this as our schemas do not include the ID. Keep this.
		const tmpId = txRoot.id;
		delete txRoot.id;

		const schemaParams = getTransactionParamsSchema(txRoot, this._schema);
		const txParamsObject = codec.fromJSON(schemaParams, txParams as Record<string, unknown>);
		const txRootObject = codec.fromJSON(this._schema.transaction, txRoot);

		const txObject = {
			...txRootObject,
			params: txParamsObject,
			id: typeof tmpId === 'string' ? Buffer.from(tmpId, 'hex') : Buffer.alloc(0),
		};

		return txObject;
	}
}
