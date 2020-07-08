/*
 * Copyright © 2019 Lisk Foundation
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

import { Status as TransactionStatus, TransactionResponse } from '@liskhq/lisk-transactions';

import { DataAccess } from './data_access';
import * as transactionsModule from './transactions';
import { BlockHeader, Block, Context, MatcherTransaction } from './types';

export const verifyBlockNotExists = async (dataAccess: DataAccess, block: Block): Promise<void> => {
	const isPersisted = await dataAccess.isBlockPersisted(block.header.id);
	if (isPersisted) {
		throw new Error(`Block ${block.header.id.toString('base64')} already exists`);
	}
};

export const verifyPreviousBlockId = (
	block: Block,
	lastBlock: Block,
	genesisBlock: Block,
): void => {
	const isGenesisBlock =
		block.header.id.equals(genesisBlock.header.id) &&
		block.header.version === genesisBlock.header.version;

	const isConsecutiveBlock =
		lastBlock.header.height + 1 === block.header.height &&
		block.header.previousBlockID.equals(lastBlock.header.id);

	if (!isGenesisBlock && !isConsecutiveBlock) {
		throw new Error('Invalid previous block');
	}
};

interface BlockVerifyInput {
	readonly dataAccess: DataAccess;
	readonly genesisBlock: Block;
}

export class BlocksVerify {
	private readonly dataAccess: DataAccess;
	private readonly genesisBlock: Block;

	public constructor({ dataAccess, genesisBlock }: BlockVerifyInput) {
		this.dataAccess = dataAccess;
		this.genesisBlock = genesisBlock;
	}

	public async checkExists(block: Block): Promise<void> {
		const isPersisted = await this.dataAccess.isBlockPersisted(block.header.id);
		if (isPersisted) {
			throw new Error(`Block ${block.header.id.toString('base64')} already exists`);
		}
		if (!block.payload.length) {
			return;
		}
		const transactionIDs = block.payload.map(transaction => transaction.id);
		const persistedTransactions = await this.dataAccess.getTransactionsByIDs(transactionIDs);

		if (persistedTransactions.length > 0) {
			throw new Error(
				`Transaction is already confirmed: ${persistedTransactions[0].id.toString('base64')}`,
			);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await,class-methods-use-this
	public async checkTransactions(block: Block): Promise<void> {
		const { version, height, timestamp } = block.header;
		if (block.payload.length === 0) {
			return;
		}
		const context: Context = {
			blockVersion: version,
			blockHeight: height,
			blockTimestamp: timestamp,
		};

		const nonAllowedTxResponses = transactionsModule
			.checkAllowedTransactions(block.payload as MatcherTransaction[], context)
			.find(
				(transactionResponse: TransactionResponse) =>
					transactionResponse.status !== TransactionStatus.OK,
			);

		if (nonAllowedTxResponses) {
			throw nonAllowedTxResponses.errors;
		}
	}

	public matchGenesisBlock(block: BlockHeader): boolean {
		return (
			block.id.equals(this.genesisBlock.header.id) &&
			block.version === this.genesisBlock.header.version &&
			block.transactionRoot.equals(this.genesisBlock.header.transactionRoot) &&
			block.signature.equals(this.genesisBlock.header.signature)
		);
	}
}
