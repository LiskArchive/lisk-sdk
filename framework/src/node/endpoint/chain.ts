/*
 * Copyright © 2022 Lisk Foundation
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
import { Chain } from '@liskhq/lisk-chain';
import { NotFoundError } from '@liskhq/lisk-db';
import { isHexString } from '@liskhq/lisk-validator';
import { RequestContext } from '../rpc/rpc_server';

interface EndpoinArgs {
	chain: Chain;
}

export class ChainEndpoint {
	[key: string]: unknown;
	private readonly _chain: Chain;

	public constructor(args: EndpoinArgs) {
		this._chain = args.chain;
	}

	public async getBlockByID(context: RequestContext): Promise<string | undefined> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. id must be a valid hex string.');
		}
		const block = await this._chain.dataAccess.getBlockByID(Buffer.from(id as string, 'hex'));
		return block.getBytes().toString('hex');
	}

	public async getBlocksByIDs(context: RequestContext): Promise<readonly string[]> {
		const { ids } = context.params;
		if (!Array.isArray(ids) || ids.length === 0) {
			throw new Error('Invalid parameters. ids must be a non empty array.');
		}
		if (!ids.every(id => isHexString(id))) {
			throw new Error('Invalid parameters. id must a valid hex string.');
		}
		const blocks = [];
		try {
			for (const id of ids) {
				const block = await this._chain.dataAccess.getBlockByID(Buffer.from(id, 'hex'));
				blocks.push(block);
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		return blocks.map(block => block.getBytes().toString('hex'));
	}
	public async getBlockByHeight(context: RequestContext): Promise<string | undefined> {
		const { height } = context.params;
		if (typeof height !== 'number') {
			throw new Error('Invalid parameters. height must be a number.');
		}

		const block = await this._chain.dataAccess.getBlockByHeight(height);
		return block.getBytes().toString('hex');
	}

	public async getBlocksByHeightBetween(context: RequestContext): Promise<readonly string[]> {
		const { from, to } = context.params;
		if (typeof from !== 'number' || typeof to !== 'number') {
			throw new Error('Invalid parameters. from and to must be a number.');
		}
		const blocks = await this._chain.dataAccess.getBlocksByHeightBetween(from, to);

		return blocks.map(b => b.getBytes().toString('hex'));
	}

	public async getTransactionByID(context: RequestContext): Promise<string> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. id must be a valid hex string.');
		}
		const transaction = await this._chain.dataAccess.getTransactionByID(
			Buffer.from(id as string, 'hex'),
		);
		return transaction.getBytes().toString('hex');
	}

	public async getTransactionsByIDs(context: RequestContext): Promise<string[]> {
		const { ids } = context.params;
		if (!Array.isArray(ids) || ids.length === 0) {
			throw new Error('Invalid parameters. ids must be a non empty array.');
		}
		if (!ids.every(id => isHexString(id))) {
			throw new Error('Invalid parameters. id must a valid hex string.');
		}
		const transactions = [];
		try {
			for (const id of ids) {
				const transaction = await this._chain.dataAccess.getTransactionByID(Buffer.from(id, 'hex'));
				transactions.push(transaction);
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		return transactions.map(tx => tx.getBytes().toString('hex'));
	}

	public getLastBlock(): string {
		return this._chain.lastBlock.getBytes().toString('hex');
	}
}
