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

import {
	Status as TransactionStatus,
	TransactionResponse,
} from '@liskhq/lisk-transactions';

import { DataAccess } from './data_access';
import { StateStore } from './state_store';
import * as transactionsModule from './transactions';
import {
	BlockHeader,
	BlockInstance,
	Context,
	ExceptionOptions,
	MatcherTransaction,
	Slots,
	Storage,
} from './types';

export const verifyBlockNotExists = async (
	storage: Storage,
	block: BlockInstance,
) => {
	const isPersisted = await storage.entities.Block.isPersisted({
		id: block.id,
	});
	if (isPersisted) {
		throw new Error(`Block ${block.id} already exists`);
	}
};

export const verifyPreviousBlockId = (
	block: BlockInstance,
	lastBlock: BlockInstance,
	genesisBlock: BlockInstance,
) => {
	const isGenesisBlock =
		block.id === genesisBlock.id &&
		!block.previousBlockId &&
		block.height === 1;

	const isConsecutiveBlock =
		lastBlock.height + 1 === block.height &&
		block.previousBlockId === lastBlock.id;

	if (!isGenesisBlock && !isConsecutiveBlock) {
		throw new Error('Invalid previous block');
	}
};

interface BlockVerifyInput {
	readonly dataAccess: DataAccess;
	readonly slots: Slots;
	readonly exceptions: ExceptionOptions;
	readonly genesisBlock: BlockHeader;
}

export class BlocksVerify {
	private readonly dataAccess: DataAccess;
	private readonly slots: Slots;
	private readonly exceptions: ExceptionOptions;
	private readonly genesisBlock: BlockHeader;

	public constructor({
		dataAccess,
		exceptions,
		slots,
		genesisBlock,
	}: BlockVerifyInput) {
		this.dataAccess = dataAccess;
		this.slots = slots;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
	}

	public async checkExists(block: BlockInstance): Promise<void> {
		const isPersisted = await this.dataAccess.isBlockPersisted(block.id);
		if (isPersisted) {
			throw new Error(`Block ${block.id} already exists`);
		}
		if (!block.transactions.length) {
			return;
		}
		const transactionIDs = block.transactions.map(
			transaction => transaction.id,
		);
		const persistedTransactions = await this.dataAccess.getTransactionsByIDs(
			transactionIDs,
		);

		if (persistedTransactions.length > 0) {
			throw new Error(
				`Transaction is already confirmed: ${persistedTransactions[0].id}`,
			);
		}
	}

	public async checkTransactions(
		blockInstance: BlockInstance,
		stateStore: StateStore,
	): Promise<void> {
		const { version, height, timestamp, transactions } = blockInstance;
		if (transactions.length === 0) {
			return;
		}
		const context: Context = {
			blockVersion: version,
			blockHeight: height,
			blockTimestamp: timestamp,
		};

		const nonInertTransactions = transactions.filter(
			transaction =>
				!transactionsModule.checkIfTransactionIsInert(
					transaction,
					this.exceptions,
				),
		);

		const nonAllowedTxResponses = transactionsModule
			.checkAllowedTransactions(context)(
				nonInertTransactions as MatcherTransaction[],
			)
			.transactionsResponses.find(
				(transactionResponse: TransactionResponse) =>
					transactionResponse.status !== TransactionStatus.OK,
			);

		if (nonAllowedTxResponses) {
			throw nonAllowedTxResponses.errors;
		}

		const {
			transactionsResponses,
		} = await transactionsModule.verifyTransactions(
			this.slots,
			this.exceptions,
		)(nonInertTransactions, stateStore);

		const unverifiableTransactionsResponse = transactionsResponses.filter(
			(transactionResponse: TransactionResponse) =>
				transactionResponse.status !== TransactionStatus.OK,
		);

		if (unverifiableTransactionsResponse.length > 0) {
			throw unverifiableTransactionsResponse[0].errors;
		}
	}

	public matchGenesisBlock(block: BlockHeader): boolean {
		return (
			block.id === this.genesisBlock.id &&
			block.payloadHash === this.genesisBlock.payloadHash &&
			block.blockSignature === this.genesisBlock.blockSignature
		);
	}
}
