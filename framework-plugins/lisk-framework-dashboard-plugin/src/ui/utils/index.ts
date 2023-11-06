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
import { Block, BlockHeader, Transaction } from '../types';

interface Config {
	applicationUrl: string;
	applicationName: string;
}

const configDevEnvValues: Config = {
	applicationUrl: 'ws://localhost:7887/rpc-ws',
	applicationName: 'Lisk',
};

export const getKeyPath = (offset: number) => `m/44'/134'/${offset}'`;

const MAX_BLOCKS = 103 * 3;
const MAX_TRANSACTIONS = 150;

const sortByBlockHeight = (a: Block, b: Block) => b.header.height - a.header.height;

export const updateStatesOnNewBlock = async (
	client: apiClient.APIClient,
	newBlockHeader: BlockHeader,
	blocks: Block[],
	confirmedTransactions: Transaction[],
	unconfirmedTransactions: Transaction[],
): Promise<{
	blocks: Block[];
	confirmedTransactions: Transaction[];
	unconfirmedTransactions: Transaction[];
}> => {
	if (!blocks || blocks.find(b => b.header.height === newBlockHeader.height)) {
		return {
			blocks,
			confirmedTransactions,
			unconfirmedTransactions,
		};
	}
	const transactions = await client.invoke<Transaction[]>('chain_getTransactionsByHeight', {
		height: newBlockHeader.height,
	});

	const newBlocks = [{ header: newBlockHeader, transactions }, ...blocks].slice(0, MAX_BLOCKS);
	newBlocks.sort(sortByBlockHeight);

	for (const trs of transactions) {
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
	newTransactionStr: Transaction,
	unconfirmedTransactions: Transaction[],
): Transaction[] => [newTransactionStr, ...unconfirmedTransactions].slice(-1 * MAX_TRANSACTIONS);

export const getConfig = async () => {
	if (process.env.NODE_ENV === 'development') {
		return configDevEnvValues;
	}

	const apiResponse = await fetch('/api/config');
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const result: Config = await apiResponse.json();

	return result;
};
