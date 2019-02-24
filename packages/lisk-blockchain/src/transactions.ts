import * as BigNum from 'browserify-bignum';
import * as crypto from 'crypto';
import { Transaction, TransactionJSON, TransactionMap } from './types';

interface TransactionData {
	readonly totalFee: string;
	readonly totalAmount: string;
	readonly payloadHash: string;
	readonly payloadLength: number;
	readonly numberOfTransactions: number;
}

export const calculateTransactionsData = (
	transactions: ReadonlyArray<Transaction>,
): TransactionData => {
	const data = transactions.reduce(
		(prev, current) => {
			const txBytes = current.getBytes();
			prev.calculatedHash.update(txBytes);
			const totalFee = new BigNum(prev.totalFee).add(current.fee).toString();
			const totalAmount = new BigNum(prev.totalAmount)
				.add(current.amount)
				.toString();

			return {
				payloadLength: prev.payloadLength + txBytes.length,
				calculatedHash: prev.calculatedHash,
				totalFee,
				totalAmount,
			};
		},
		{
			payloadLength: 0,
			calculatedHash: crypto.createHash('sha256'),
			totalFee: '0',
			totalAmount: '0',
		},
	);
	const { calculatedHash, ...txData } = data;
	const payloadHash = calculatedHash.digest().toString('hex');

	return {
		...txData,
		numberOfTransactions: transactions.length,
		payloadHash,
	};
};

export const sortTransactions = (transactions: TransactionJSON[]) =>
	transactions.sort((a, b) => {
		if (a.type === 1) {
			return 1;
		}
		if (a.type < b.type) {
			return -1;
		}
		if (a.type > b.type) {
			return 1;
		}
		if (a.amount < b.amount) {
			return -1;
		}
		if (a.amount > b.amount) {
			return 1;
		}

		return 0;
	});

export const rawTransactionToInstance = (
	txMap: TransactionMap,
	transactions: ReadonlyArray<TransactionJSON>,
): ReadonlyArray<Transaction> =>
	transactions.map(raw => new txMap[raw.type](raw));
