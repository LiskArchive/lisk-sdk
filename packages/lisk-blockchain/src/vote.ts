import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import { Account } from './account';
import {
	TRANSACTION_TYPE_IN_TRANSFER,
	TRANSACTION_TYPE_OUT_TRANSFER,
	TRANSACTION_TYPE_TRANSFER,
	TRANSACTION_TYPE_VOTE,
} from './constants';
import { BUCKET_ADDRESS_ACCOUNT, BUCKET_TX_ID_TX } from './repo';
import { StateStore } from './state_store';
import { InTransferTransaction, Transaction, VoteTransaction } from './types';

const applyAmount = async (
	store: StateStore,
	tx: Transaction,
): Promise<void> => {
	if (
		![
			TRANSACTION_TYPE_TRANSFER,
			TRANSACTION_TYPE_IN_TRANSFER,
			TRANSACTION_TYPE_OUT_TRANSFER,
		].includes(tx.type)
	) {
		return;
	}
	// tslint:disable-next-line no-let
	let recipientId = tx.recipientId as string;
	if (tx.type === TRANSACTION_TYPE_IN_TRANSFER) {
		const dappTx = await store.get<Transaction>(
			BUCKET_TX_ID_TX,
			(tx as InTransferTransaction).asset.inTransfer.dappId,
		);
		recipientId = dappTx.senderId;
	}

	const recipient = await store.get<Account>(
		BUCKET_ADDRESS_ACCOUNT,
		recipientId,
	);
	const delegateAddresses = recipient.votedDelegatesPublicKeys
		? recipient.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	delegateAddresses.forEach(async address => {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').add(tx.amount).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
	});
};

const undoAmount = async (
	store: StateStore,
	tx: Transaction,
): Promise<void> => {
	if (
		![
			TRANSACTION_TYPE_TRANSFER,
			TRANSACTION_TYPE_IN_TRANSFER,
			TRANSACTION_TYPE_OUT_TRANSFER,
		].includes(tx.type)
	) {
		return;
	}
	// tslint:disable-next-line no-let
	let recipientId = tx.recipientId as string;
	if (tx.type === TRANSACTION_TYPE_IN_TRANSFER) {
		const dappTx = await store.get<Transaction>(
			BUCKET_TX_ID_TX,
			(tx as InTransferTransaction).asset.inTransfer.dappId,
		);
		recipientId = dappTx.senderId;
	}

	const recipient = await store.get<Account>(
		BUCKET_ADDRESS_ACCOUNT,
		recipientId,
	);
	const delegateAddresses = recipient.votedDelegatesPublicKeys
		? recipient.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	delegateAddresses.forEach(async address => {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(tx.amount).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
	});
};

const applyFee = async (store: StateStore, tx: Transaction): Promise<void> => {
	const sender = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, tx.senderId);
	const delegateAddresses = sender.votedDelegatesPublicKeys
		? sender.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	delegateAddresses.forEach(async address => {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(tx.fee).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
	});
};

const undoFee = async (store: StateStore, tx: Transaction): Promise<void> => {
	const sender = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, tx.senderId);
	const delegateAddresses = sender.votedDelegatesPublicKeys
		? sender.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	delegateAddresses.forEach(async address => {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').add(tx.fee).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
	});
};

const applyNewVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<void> => {
	if (tx.type !== TRANSACTION_TYPE_VOTE) {
		return;
	}
	const sender = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, tx.senderId);
	const upvotes = (tx as VoteTransaction).asset.votes
		.filter(signedVote => signedVote[0] === '+')
		.map(signedUpvote => {
			const publicKey = signedUpvote.slice(1);

			return getAddressFromPublicKey(publicKey);
		});
	const downvotes = (tx as VoteTransaction).asset.votes
		.filter(signedVote => signedVote[0] === '-')
		.map(signedUpvote => {
			const publicKey = signedUpvote.slice(1);

			return getAddressFromPublicKey(publicKey);
		});
	upvotes.forEach(async address => {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').add(sender.balance).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
	});
	downvotes.forEach(async address => {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0')
				.sub(sender.balance)
				.add(tx.fee)
				.toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
	});
};

const undoNewVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<void> => {
	if (tx.type !== TRANSACTION_TYPE_VOTE) {
		return;
	}
	const sender = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, tx.senderId);
	const upvotes = (tx as VoteTransaction).asset.votes
		.filter(signedVote => signedVote[0] === '+')
		.map(signedUpvote => {
			const publicKey = signedUpvote.slice(1);

			return getAddressFromPublicKey(publicKey);
		});
	const downvotes = (tx as VoteTransaction).asset.votes
		.filter(signedVote => signedVote[0] === '-')
		.map(signedUpvote => {
			const publicKey = signedUpvote.slice(1);

			return getAddressFromPublicKey(publicKey);
		});
	upvotes.forEach(async address => {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(sender.balance).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
	});
	downvotes.forEach(async address => {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0')
				.add(sender.balance)
				.sub(tx.fee)
				.toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
	});
};

export const applyVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<void[]> =>
	Promise.all([
		applyFee(store, tx),
		applyAmount(store, tx),
		applyNewVote(store, tx),
	]);

export const undoVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<void[]> =>
	Promise.all([
		undoFee(store, tx),
		undoAmount(store, tx),
		undoNewVote(store, tx),
	]);
