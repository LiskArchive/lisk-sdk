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
import { apiClient } from '@liskhq/lisk-client';
import { Block, Transaction } from '../types';

interface Config {
	applicationUrl: string;
	applicationName: string;
}

const configDevEnvValues: Config = {
	applicationUrl: 'ws://localhost:8080/ws',
	applicationName: 'Lisk',
};

const MAX_BLOCKS = 103 * 3;
const MAX_TRANSACTIONS = 150;

const sortByBlockHeight = (a: Block, b: Block) => b.header.height - a.header.height;

export const updateStatesOnNewBlock = (
	client: apiClient.APIClient,
	newBlockStr: string,
	blocks: Block[],
	confirmedTransactions: Transaction[],
	unconfirmedTransactions: Transaction[],
): {
	blocks: Block[];
	confirmedTransactions: Transaction[];
	unconfirmedTransactions: Transaction[];
} => {
	const newBlock = client.block.toJSON(client.block.decode(newBlockStr));
	let newBlocks = blocks;
	if (!blocks.find(b => b.header.height === newBlock.header.height)) {
		newBlocks = [newBlock, ...blocks].slice(0, MAX_BLOCKS) as Block[];
	}
	newBlocks.sort(sortByBlockHeight);

	for (const trs of newBlock.transactions) {
		confirmedTransactions.unshift(trs as unknown as Transaction);
	}
	const confirmedTransactionsIds = confirmedTransactions.map(t => t.id);
	const newUnconfirmedTransactions = unconfirmedTransactions
		.filter(t => !confirmedTransactionsIds.includes(t.id))
		.slice(0, MAX_TRANSACTIONS);

	const newConfirmedTransactions = confirmedTransactions.slice(0, MAX_TRANSACTIONS);

	return {
		blocks: newBlocks,
		confirmedTransactions: newConfirmedTransactions,
		unconfirmedTransactions: newUnconfirmedTransactions,
	};
};

export const updateStatesOnNewTransaction = (
	client: apiClient.APIClient,
	newTransactionStr: string,
	unconfirmedTransactions: Transaction[],
): Transaction[] => {
	const transaction = client.transaction.toJSON(client.transaction.decode(newTransactionStr));
	return [transaction, ...unconfirmedTransactions].slice(-1 * MAX_TRANSACTIONS) as Transaction[];
};

export const getConfig = async () => {
	if (process.env.NODE_ENV === 'development') {
		return configDevEnvValues;
	}

	const apiResponse = await fetch('/api/config');
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const result: Config = await apiResponse.json();

	return result;
};
