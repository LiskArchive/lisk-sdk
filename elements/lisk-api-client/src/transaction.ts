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
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import {
	decodeTransaction,
	decodeTransactionParams,
	encodeTransaction,
	fromTransactionJSON,
	getTransactionParamsSchema,
	toTransactionJSON,
} from './codec';
import {
	Channel,
	RegisteredSchemas,
	NodeInfo,
	ModuleMetadata,
	DecodedTransaction,
	TransactionJSON,
	Transaction as ITransaction,
	DecodedTransactionJSON,
} from './types';

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
	private readonly _metadata: ModuleMetadata[];
	private readonly _schema: RegisteredSchemas;
	private readonly _nodeInfo: NodeInfo;

	public constructor(
		channel: Channel,
		registeredSchema: RegisteredSchemas,
		moduleMetadata: ModuleMetadata[],
		nodeInfo: NodeInfo,
	) {
		this._channel = channel;
		this._metadata = moduleMetadata;
		this._schema = registeredSchema;
		this._nodeInfo = nodeInfo;
	}

	public async create<T = Record<string, unknown>>(
		input: {
			moduleID?: number; // id takes priority
			moduleName?: string;
			commandID?: number; // id takes priority
			commandName?: string;
			fee: bigint;
			nonce?: bigint;
			senderPublicKey?: Buffer;
			params: T;
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
	): Promise<DecodedTransaction<T>> {
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
			const registeredModule = this._metadata.find(module => module.name === input.moduleName);
			if (!registeredModule) {
				throw new Error(`Module corresponding to name ${txInput.moduleName} not registered.`);
			}
			txInput.moduleID = registeredModule.id;
		}
		if (typeof txInput.commandID !== 'number') {
			if (!txInput.commandName) {
				throw new Error('Missing commandID and commandName');
			}
			const registeredModule = this._metadata.find(m => m.id === txInput.moduleID);
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
		const commandSchema = getTransactionParamsSchema(
			txInput as Omit<DecodedTransaction, 'id' | 'signatures'>,
			this._metadata,
		);
		if (authAccount.numberOfSignatures > 0) {
			return signMultiSignatureTransaction(
				txInput,
				networkIdentifier,
				passphrase,
				{
					mandatoryKeys: authAccount.mandatoryKeys.map(k => Buffer.from(k, 'hex')),
					optionalKeys: authAccount.optionalKeys.map(k => Buffer.from(k, 'hex')),
				},
				commandSchema,
				options?.includeSenderSignature,
			) as DecodedTransaction<T>;
		}
		if (options?.multisignatureKeys && options?.includeSenderSignature) {
			return signMultiSignatureTransaction(
				txInput,
				networkIdentifier,
				passphrase,
				options.multisignatureKeys,
				commandSchema,
				options.includeSenderSignature,
			) as DecodedTransaction<T>;
		}
		return signTransaction(
			txInput,
			networkIdentifier,
			passphrase,
			commandSchema,
		) as DecodedTransaction<T>;
	}

	public async get(id: Buffer | string): Promise<DecodedTransaction> {
		const idString: string = Buffer.isBuffer(id) ? id.toString('hex') : id;
		const transactionJSON = await this._channel.invoke<TransactionJSON>(
			'chain_getTransactionByID',
			{
				id: idString,
			},
		);
		return this.fromJSON(transactionJSON);
	}

	public async getFromPool(): Promise<DecodedTransaction[]> {
		const transactions = await this._channel.invoke<TransactionJSON[]>(
			'chain_getTransactionsFromPool',
		);
		return transactions.map(tx => this.fromJSON(tx));
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
	): Promise<DecodedTransaction> {
		this._validateTransaction(transaction);
		const commandSchema = getTransactionParamsSchema(transaction, this._metadata);
		const networkIdentifier = Buffer.from(this._nodeInfo.networkIdentifier, 'hex');
		const address = getAddressFromPublicKey(transaction.senderPublicKey);
		const authAccount = await this._channel.invoke<AuthAccount>('auth_getAuthAccount', {
			address: address.toString('hex'),
		});
		const decodedTx = decodeTransactionParams(transaction, this._metadata);
		if (authAccount.numberOfSignatures > 0) {
			for (const passphrase of passphrases) {
				signMultiSignatureTransaction(
					decodedTx,
					networkIdentifier,
					passphrase,
					{
						mandatoryKeys: authAccount.mandatoryKeys.map(k => Buffer.from(k, 'hex')),
						optionalKeys: authAccount.optionalKeys.map(k => Buffer.from(k, 'hex')),
					},
					commandSchema,
					options?.includeSenderSignature,
				);
			}
			return decodedTx;
		}
		if (options?.multisignatureKeys && options?.includeSenderSignature) {
			for (const passphrase of passphrases) {
				signMultiSignatureTransaction(
					decodedTx,
					networkIdentifier,
					passphrase,
					options.multisignatureKeys as MultiSignatureKeys,
					commandSchema,
					options.includeSenderSignature,
				);
			}
			return decodedTx;
		}
		return signTransaction(
			decodedTx,
			networkIdentifier,
			passphrases[0],
			commandSchema,
		) as DecodedTransaction;
	}

	public async send(
		transaction: Record<string, unknown>,
	): Promise<{
		transactionId: string;
	}> {
		this._validateTransaction(transaction);
		const encodedTx = encodeTransaction(transaction, this._schema, this._metadata);
		return this._channel.invoke<{
			transactionId: string;
		}>('generation_postTransaction', { transaction: encodedTx.toString('hex') });
	}

	public decode<T = Record<string, unknown>>(transaction: Buffer | string): DecodedTransaction<T> {
		const transactionBuffer: Buffer = Buffer.isBuffer(transaction)
			? transaction
			: Buffer.from(transaction, 'hex');
		return decodeTransaction(transactionBuffer, this._schema, this._metadata);
	}

	public encode(transaction: Record<string, unknown>): Buffer {
		this._validateTransaction(transaction);
		return encodeTransaction(transaction, this._schema, this._metadata);
	}

	public computeMinFee(transaction: Record<string, unknown>): bigint {
		this._validateTransaction(transaction);
		const commandSchema = getTransactionParamsSchema(transaction, this._metadata);
		const numberOfSignatures = transaction.signatures ? transaction.signatures.length : 1;
		const options: Options = {
			minFeePerByte: this._nodeInfo.genesisConfig.minFeePerByte,
			baseFees: this._nodeInfo.genesisConfig.baseFees,
			numberOfSignatures,
		};

		return computeMinFee(transaction, commandSchema, options);
	}

	public toJSON(transaction: Record<string, unknown>): DecodedTransactionJSON {
		this._validateTransaction(transaction);
		return toTransactionJSON(
			transaction as DecodedTransaction | ITransaction,
			this._schema,
			this._metadata,
		);
	}

	public fromJSON<T = Record<string, unknown>>(
		transaction: TransactionJSON | DecodedTransactionJSON,
	): DecodedTransaction<T> {
		return fromTransactionJSON<T>(transaction, this._schema, this._metadata);
	}

	private _validateTransaction(transaction: unknown): asserts transaction is DecodedTransaction {
		if (typeof transaction !== 'object' || transaction === null) {
			throw new Error('Transaction must be an object.');
		}
		const { params, ...rest } = transaction as Record<string, unknown>;
		const errors = validator.validate(this._schema.transaction, {
			...rest,
			params: Buffer.alloc(0),
		});
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		if (Buffer.isBuffer(params)) {
			throw new Error('Transaction parameter is not decoded.');
		}
	}
}
