import { Transaction } from './transaction_pool';

export type transactionFilterableKeys =
	| 'id'
	| 'recipientId'
	| 'senderPublicKey'
	| 'type';

export const checkTransactionPropertyForValues = (
	values: ReadonlyArray<string | number>,
	propertyName: transactionFilterableKeys,
): ((transaction: Transaction) => boolean) => (transaction: Transaction) =>
	values.indexOf(transaction[propertyName]) !== -1;

export const returnTrueUntilLimit = (
	limit: number,
): ((transaction: Transaction) => boolean) => {
	// tslint:disable-next-line
	let current = 0;

	return _ => current++ < limit;
};

export const checkTransactionForExpiry = (
): ((transaction: Transaction) => boolean) => {
	const timeNow = new Date();

	return (transaction: Transaction) => transaction.isExpired(timeNow);
};

export const checkTransactionForSenderPublicKey = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const senderProperty: transactionFilterableKeys = 'senderPublicKey';
	const senderPublicKeys = transactions.map(
		transaction => transaction[senderProperty],
	);

	return checkTransactionPropertyForValues(senderPublicKeys, senderProperty);
};

export const checkTransactionForId = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const idProperty: transactionFilterableKeys = 'id';
	const ids = transactions.map(transaction => transaction.id);

	return checkTransactionPropertyForValues(ids, idProperty);
};

export const checkTransactionForRecipientId = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const recipientProperty: transactionFilterableKeys = 'recipientId';
	const recipients = transactions.map(
		transaction => transaction[recipientProperty],
	);

	return checkTransactionPropertyForValues(recipients, recipientProperty);
};

export const checkTransactionForTypes = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const typeProperty: transactionFilterableKeys = 'type';
	const types: ReadonlyArray<number> = transactions.map(
		(transaction: Transaction) => transaction[typeProperty],
	);

	return checkTransactionPropertyForValues(types, typeProperty);
};
