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

import { Transaction } from '@liskhq/lisk-chain';
import { StateStore } from '@liskhq/lisk-chain/dist-node/state_store';
import {
	decryptPassphraseWithPassword,
	generatePrivateKey,
	getAddressFromPublicKey,
	getPrivateAndPublicKeyFromPassphrase,
	parseEncryptedPassphrase,
} from '@liskhq/lisk-cryptography';
import { KVStore } from '@liskhq/lisk-db';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { dataStructures } from '@liskhq/lisk-utils';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { Logger } from '../../logger';
import { Generator } from '../../types';
import { EventQueue, StateMachine, TransactionContext, VerifyStatus } from '../state_machine';
import { Broadcaster } from './broadcaster';
import { InvalidTransactionError } from './errors';
import { GeneratorStore } from './generator_store';
import {
	getLastGeneratedInfo,
	isEqualGeneratedInfo,
	isZeroValueGeneratedInfo,
	setLastGeneratedInfo,
} from './generated_info';
import {
	GeneratedInfo,
	GetStatusResponse,
	PostTransactionRequest,
	postTransactionRequestSchema,
	PostTransactionResponse,
	UpdateStatusRequest,
	updateStatusRequestSchema,
	UpdateStatusResponse,
} from './schemas';
import { Consensus, Keypair } from './types';
import { RequestContext } from '../rpc/rpc_server';

interface EndpointArgs {
	keypair: dataStructures.BufferMap<Keypair>;
	generators: Generator[];
	consensus: Consensus;
	stateMachine: StateMachine;
	pool: TransactionPool;
	broadcaster: Broadcaster;
}

interface EndpointInit {
	logger: Logger;
	generatorDB: KVStore;
	blockchainDB: KVStore;
}

export class Endpoint {
	[key: string]: unknown;

	private readonly _keypairs: dataStructures.BufferMap<Keypair>;
	private readonly _generators: Generator[];
	private readonly _consensus: Consensus;
	private readonly _stateMachine: StateMachine;
	private readonly _pool: TransactionPool;
	private readonly _broadcaster: Broadcaster;

	private _logger!: Logger;
	private _generatorDB!: KVStore;
	private _blockchainDB!: KVStore;

	public constructor(args: EndpointArgs) {
		this._keypairs = args.keypair;
		this._generators = args.generators;
		this._consensus = args.consensus;
		this._stateMachine = args.stateMachine;
		this._pool = args.pool;
		this._broadcaster = args.broadcaster;
	}

	public init(args: EndpointInit) {
		this._logger = args.logger;
		this._generatorDB = args.generatorDB;
		this._blockchainDB = args.blockchainDB;
	}

	public async postTransaction(ctx: RequestContext): Promise<PostTransactionResponse> {
		const reqErrors = validator.validate(postTransactionRequestSchema, ctx.params);
		if (reqErrors?.length) {
			throw new LiskValidationError(reqErrors);
		}
		const req = (ctx.params as unknown) as PostTransactionRequest;
		const transaction = Transaction.fromBytes(Buffer.from(req.transaction, 'hex'));
		const txContext = new TransactionContext({
			eventQueue: new EventQueue(),
			logger: this._logger,
			networkIdentifier: ctx.networkIdentifier,
			stateStore: new StateStore(this._blockchainDB),
			transaction,
		});
		const result = await this._stateMachine.verifyTransaction(txContext);
		if (result.status === VerifyStatus.FAIL) {
			throw new InvalidTransactionError(
				result.error?.message ?? 'Transaction verification failed.',
				transaction.id,
			);
		}
		if (this._pool.contains(transaction.id)) {
			return {
				transactionId: transaction.id.toString('hex'),
			};
		}

		// Broadcast transaction to network if not present in pool
		this._broadcaster.enqueueTransactionId(transaction.id);

		const { error } = await this._pool.add(transaction);
		if (error) {
			this._logger.error({ err: error }, 'Failed to add transaction to pool.');
			throw new InvalidTransactionError(
				error.message ?? 'Transaction verification failed.',
				transaction.id,
			);
		}

		this._logger.info(
			{
				id: transaction.id,
				nonce: transaction.nonce.toString(),
				senderPublicKey: transaction.senderPublicKey,
			},
			'Added transaction to pool',
		);
		return {
			transactionId: transaction.id.toString('hex'),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getStatus(_context: RequestContext): Promise<GetStatusResponse> {
		const status: GetStatusResponse = [];
		for (const gen of this._generators) {
			status.push({
				address: gen.address,
				enabled: this._keypairs.has(Buffer.from(gen.address, 'hex')),
			});
		}
		return status;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getTransactionsFromPool(_context: RequestContext): Promise<string[]> {
		return this._pool.getAll().map(tx => tx.getBytes().toString('hex'));
	}

	public async updateStatus(ctx: RequestContext): Promise<UpdateStatusResponse> {
		const reqErrors = validator.validate(updateStatusRequestSchema, ctx.params);
		if (reqErrors?.length) {
			throw new LiskValidationError(reqErrors);
		}
		const req = (ctx.params as unknown) as UpdateStatusRequest;
		const address = Buffer.from(req.address, 'hex');
		const encryptedGenerator = this._generators.find(item => item.address === req.address);

		let passphrase: string;

		if (!encryptedGenerator) {
			throw new Error(`Generator with address: ${req.address} not found.`);
		}

		try {
			passphrase = decryptPassphraseWithPassword(
				parseEncryptedPassphrase(encryptedGenerator.encryptedPassphrase),
				req.password,
			);
		} catch (e) {
			throw new Error('Invalid password and public key combination.');
		}

		const blsSK = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
		const keypair = {
			...getPrivateAndPublicKeyFromPassphrase(passphrase),
			blsSecretKey: blsSK,
		};

		if (!getAddressFromPublicKey(keypair.publicKey).equals(Buffer.from(req.address, 'hex'))) {
			throw new Error(
				`Invalid keypair: ${getAddressFromPublicKey(keypair.publicKey).toString(
					'hex',
				)}  and address: ${req.address} combination`,
			);
		}

		if (!req.enable) {
			// Disable delegate by removing keypairs corresponding to address
			this._keypairs.delete(Buffer.from(req.address, 'hex'));
			ctx.logger.info(`Forging disabled on account: ${req.address}`);
			return {
				address: req.address,
				enabled: false,
			};
		}

		const synced = this._consensus.isSynced(req.height, req.maxHeightPrevoted);
		if (!synced) {
			throw new Error('Failed to enable forging as the node is not synced to the network.');
		}

		const generatorStore = new GeneratorStore(this._generatorDB);
		// check
		let lastGeneratedInfo: GeneratedInfo | undefined;
		try {
			lastGeneratedInfo = await getLastGeneratedInfo(
				generatorStore,
				Buffer.from(req.address, 'hex'),
			);
		} catch (error) {
			ctx.logger.debug(`Last generated information does not exist for address: ${req.address}`);
		}

		if (req.overwrite !== true) {
			if (lastGeneratedInfo !== undefined && !isEqualGeneratedInfo(req, lastGeneratedInfo)) {
				throw new Error('Request does not match last generated information.');
			}
			if (lastGeneratedInfo === undefined && !isZeroValueGeneratedInfo(req)) {
				throw new Error('Last generated information does not exist.');
			}
		}

		if (
			lastGeneratedInfo === undefined ||
			(req.overwrite === true &&
				lastGeneratedInfo !== undefined &&
				!isEqualGeneratedInfo(req, lastGeneratedInfo))
		) {
			await setLastGeneratedInfo(generatorStore, Buffer.from(req.address, 'hex'), req);
		}

		const batch = this._generatorDB.batch();
		generatorStore.finalize(batch);
		await batch.write();

		// Enable delegate to forge by adding keypairs corresponding to address
		this._keypairs.set(address, keypair);
		ctx.logger.info(`Block generation enabled on address: ${req.address}`);

		return {
			address: req.address,
			enabled: true,
		};
	}
}
