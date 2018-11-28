import { Transaction } from './transaction_pool';

export type TransactionFilterableKeys =
	| 'id'
	| 'recipientId'
	| 'senderPublicKey'
	| 'type';

export const checkTransactionPropertyForValues = (
	values: ReadonlyArray<string | number>,
	propertyName: TransactionFilterableKeys,
): ((transaction: Transaction) => boolean) => (transaction: Transaction) =>
	values.indexOf(transaction[propertyName]) !== -1;

export const returnTrueUntilLimit = (
	limit: number,
): ((transaction: Transaction) => boolean) => {
	// tslint:disable-next-line no-let
	let current = 0;

	return _ => current++ < limit;
};

export const checkTransactionForSenderPublicKey = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const senderProperty: TransactionFilterableKeys = 'senderPublicKey';
	const senderPublicKeys = transactions.map(
		transaction => transaction[senderProperty],
	);

	return checkTransactionPropertyForValues(senderPublicKeys, senderProperty);
};

export const checkTransactionForId = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const idProperty: TransactionFilterableKeys = 'id';
	const ids = transactions.map(transaction => transaction.id);

	return checkTransactionPropertyForValues(ids, idProperty);
};

export const checkTransactionForRecipientId = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const recipientProperty: TransactionFilterableKeys = 'recipientId';
	const recipients = transactions.map(
		transaction => transaction[recipientProperty],
	);

	return checkTransactionPropertyForValues(recipients, recipientProperty);
};

export const checkTransactionForTypes = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const typeProperty: TransactionFilterableKeys = 'type';
	const types: ReadonlyArray<number> = transactions.map(
		(transaction: Transaction) => transaction[typeProperty],
	);

	return checkTransactionPropertyForValues(types, typeProperty);
};
