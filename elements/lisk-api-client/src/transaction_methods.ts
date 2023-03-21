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
	Options,
} from '@liskhq/lisk-transactions';
import { address as cryptoAddress, ed } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import {
	decodeTransaction,
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

interface AuthAccount {
	nonce: string;
	mandatoryKeys: string[];
	optionalKeys: string[];
	numberOfSignatures: number;
}

export class TransactionMethods {
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
			module: string;
			command: string;
			fee: bigint | string;
			nonce?: bigint | string;
			senderPublicKey?: string;
			params: T;
			signatures?: string[];
		},
		privateKeyHex: string,
	): Promise<DecodedTransactionJSON<T>> {
		const txInput = input;
		const chainID = Buffer.from(this._nodeInfo.chainID, 'hex');
		const privateKey = Buffer.from(privateKeyHex, 'hex');
		const publicKey = ed.getPublicKeyFromPrivateKey(privateKey);
		const address = cryptoAddress.getLisk32AddressFromPublicKey(publicKey);
		let authAccount: AuthAccount | undefined;
		try {
			authAccount = await this._channel.invoke<AuthAccount>('auth_getAuthAccount', {
				address,
			});
		} catch (error) {
			throw new Error('Auth module is not registered or does not have "getAuthAccount" endpoint.');
		}

		const registeredModule = this._metadata.find(m => m.name === txInput.module);
		if (!registeredModule) {
			throw new Error(`Module corresponding to name ${txInput.module} not registered.`);
		}
		const registeredCommand = registeredModule.commands.find(
			command => command.name === txInput.command,
		);
		if (!registeredCommand) {
			throw new Error(`Command corresponding to name ${txInput.command} not registered.`);
		}

		txInput.nonce ??= BigInt(authAccount.nonce);
		const nonce = BigInt(txInput.nonce);
		if (nonce < BigInt(0)) {
			throw new Error('Nonce must be greater or equal to zero');
		}

		txInput.senderPublicKey ??= publicKey.toString('hex');
		txInput.signatures ??= [];

		const commandSchema = getTransactionParamsSchema(
			txInput as { module: string; command: string },
			this._metadata,
		);
		const rawTx = {
			...txInput,
			module: txInput.module,
			command: txInput.command,
			nonce,
			fee: BigInt(txInput.fee),
			signatures: txInput.signatures.map(s => Buffer.from(s, 'hex')),
			senderPublicKey: Buffer.from(txInput.senderPublicKey, 'hex'),
			params: commandSchema
				? codec.fromJSON(commandSchema, txInput.params as Record<string, unknown>)
				: {},
		};
		if (authAccount.numberOfSignatures > 0) {
			const signedTx = signMultiSignatureTransaction(
				rawTx,
				chainID,
				privateKey,
				{
					mandatoryKeys: authAccount.mandatoryKeys.map(k => Buffer.from(k, 'hex')),
					optionalKeys: authAccount.optionalKeys.map(k => Buffer.from(k, 'hex')),
				},
				commandSchema,
			);
			return this.toJSON(signedTx) as DecodedTransactionJSON<T>;
		}
		const signedTx = signTransaction(rawTx, chainID, privateKey, commandSchema);
		return this.toJSON(signedTx) as DecodedTransactionJSON<T>;
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
			'txpool_getTransactionsFromPool',
		);
		return transactions.map(tx => this.fromJSON(tx));
	}

	public async sign(
		transaction: Record<string, unknown>,
		privateKeyHexes: string[],
	): Promise<DecodedTransactionJSON> {
		const commandSchema = getTransactionParamsSchema(
			transaction as TransactionJSON,
			this._metadata,
		);
		const decodedTx = this.fromJSON(transaction as TransactionJSON);
		this._validateTransaction(decodedTx);
		const chainID = Buffer.from(this._nodeInfo.chainID, 'hex');
		const address = cryptoAddress.getLisk32AddressFromPublicKey(decodedTx.senderPublicKey);
		const authAccount = await this._channel.invoke<AuthAccount>('auth_getAuthAccount', {
			address,
		});

		if (authAccount.numberOfSignatures > 0) {
			for (const privateKeyHex of privateKeyHexes) {
				const privateKey = Buffer.from(privateKeyHex, 'hex');
				signMultiSignatureTransaction(
					decodedTx,
					chainID,
					privateKey,
					{
						mandatoryKeys: authAccount.mandatoryKeys.map(k => Buffer.from(k, 'hex')),
						optionalKeys: authAccount.optionalKeys.map(k => Buffer.from(k, 'hex')),
					},
					commandSchema,
				);
			}

			return this.toJSON(decodedTx);
		}

		const signedTx = signTransaction(
			decodedTx,
			chainID,
			Buffer.from(privateKeyHexes[0], 'hex'),
			commandSchema,
		) as DecodedTransaction;

		return this.toJSON(signedTx);
	}

	public async send(transaction: DecodedTransactionJSON): Promise<{
		transactionId: string;
	}> {
		const decodedTx = this.fromJSON(transaction);
		this._validateTransaction(decodedTx);
		const encodedTx = encodeTransaction(decodedTx, this._schema, this._metadata);
		return this._channel.invoke<{
			transactionId: string;
		}>('txpool_postTransaction', { transaction: encodedTx.toString('hex') });
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

	public computeMinFee(transaction: Omit<DecodedTransactionJSON, 'id'>, options?: Options): bigint {
		const decodedTx = this.fromJSON(transaction as DecodedTransactionJSON);
		this._validateTransaction(decodedTx);
		const commandSchema = getTransactionParamsSchema(transaction, this._metadata);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return computeMinFee(decodedTx, commandSchema, options);
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
		validator.validate(this._schema.transaction, {
			...rest,
			params: Buffer.alloc(0),
		});

		if (Buffer.isBuffer(params)) {
			throw new Error('Transaction parameter is not decoded.');
		}
	}
}
