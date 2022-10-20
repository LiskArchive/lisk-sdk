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

import { Chain, Transaction, Event } from '@liskhq/lisk-chain';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { validator } from '@liskhq/lisk-validator';
import { Broadcaster } from '../generator/broadcaster';
import { InvalidTransactionError } from '../generator/errors';
import {
	DryRunTransactionRequest,
	dryRunTransactionRequestSchema,
	DryRunTransactionResponse,
	PostTransactionRequest,
	postTransactionRequestSchema,
	PostTransactionResponse,
} from '../generator/schemas';
import { RequestContext } from '../rpc/rpc_server';
import { ABI, TransactionExecutionResult, TransactionVerifyResult } from '../../abi';

interface EndpointArgs {
	abi: ABI;
	pool: TransactionPool;
	broadcaster: Broadcaster;
	chain: Chain;
}

export class TxpoolEndpoint {
	[key: string]: unknown;

	private readonly _abi: ABI;
	private readonly _pool: TransactionPool;
	private readonly _broadcaster: Broadcaster;
	private readonly _chain: Chain;

	public constructor(args: EndpointArgs) {
		this._abi = args.abi;
		this._pool = args.pool;
		this._broadcaster = args.broadcaster;
		this._chain = args.chain;
	}

	public async postTransaction(ctx: RequestContext): Promise<PostTransactionResponse> {
		validator.validate<PostTransactionRequest>(postTransactionRequestSchema, ctx.params);

		const req = ctx.params;
		const transaction = Transaction.fromBytes(Buffer.from(req.transaction, 'hex'));

		const { result } = await this._abi.verifyTransaction({
			contextID: Buffer.alloc(0),
			transaction: transaction.toObject(),
			header: this._chain.lastBlock.header.toObject(),
		});
		if (result === TransactionVerifyResult.INVALID) {
			throw new InvalidTransactionError('Transaction verification failed.', transaction.id);
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
			ctx.logger.error({ err: error }, 'Failed to add transaction to pool.');
			throw new InvalidTransactionError(
				error.message ?? 'Transaction verification failed.',
				transaction.id,
			);
		}

		ctx.logger.info(
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
	public async getTransactionsFromPool(_context: RequestContext): Promise<string[]> {
		return this._pool.getAll().map(tx => tx.getBytes().toString('hex'));
	}

	public async dryRunTransaction(ctx: RequestContext): Promise<DryRunTransactionResponse> {
		validator.validate<DryRunTransactionRequest>(dryRunTransactionRequestSchema, ctx.params);

		const req = ctx.params;
		const transaction = Transaction.fromBytes(Buffer.from(req.transaction, 'hex'));
		const header = this._chain.lastBlock.header.toObject();

		if (!req.skipVerify) {
			const { result } = await this._abi.verifyTransaction({
				contextID: Buffer.alloc(0),
				transaction: transaction.toObject(),
				header,
			});
			if (result === TransactionVerifyResult.INVALID) {
				return {
					success: false,
					events: [],
				};
			}
		}

		const response = await this._abi.executeTransaction({
			contextID: Buffer.alloc(0),
			transaction: transaction.toObject(),
			assets: this._chain.lastBlock.assets.getAll(),
			dryRun: true,
			header,
		});

		return {
			success: response.result === TransactionExecutionResult.OK,
			events: response.events.map(e => new Event(e).toJSON()),
		};
	}
}
