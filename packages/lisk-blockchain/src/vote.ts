import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import { Account } from './account';
import {
	TRANSACTION_TYPE_IN_TRANSFER,
	TRANSACTION_TYPE_OUT_TRANSFER,
	TRANSACTION_TYPE_TRANSFER,
	TRANSACTION_TYPE_VOTE,
} from './constants';
import {
	BUCKET_ADDRESS_ACCOUNT,
	BUCKET_CANDIDATE,
	BUCKET_TX_ID_TX,
} from './repo';
import { StateStore } from './state_store';
import { InTransferTransaction, Transaction, VoteTransaction } from './types';

const candidateKey = (weight: string, publicKey: string): string =>
	`${weight}:${publicKey}`;

const updateCandidateKey = async (
	store: StateStore,
	oldWeight: string,
	newWeight: string,
	address: string,
	publicKey: string,
) => {
	const oldKey = candidateKey(oldWeight, publicKey);
	const newKey = candidateKey(newWeight, publicKey);

	return store.replace(BUCKET_CANDIDATE, oldKey, newKey, address);
};

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
	// tslint:disable-next-line no-loop-statement
	for (const address of delegateAddresses) {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').add(tx.amount).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes as string,
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
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
	// tslint:disable-next-line no-loop-statement
	for (const address of delegateAddresses) {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(tx.amount).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes as string,
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
};

const applyFee = async (store: StateStore, tx: Transaction): Promise<void> => {
	const sender = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, tx.senderId);
	const delegateAddresses = sender.votedDelegatesPublicKeys
		? sender.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	// tslint:disable-next-line no-loop-statement
	for (const address of delegateAddresses) {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(tx.fee).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes as string,
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
};

const undoFee = async (store: StateStore, tx: Transaction): Promise<void> => {
	const sender = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, tx.senderId);
	const delegateAddresses = sender.votedDelegatesPublicKeys
		? sender.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	// tslint:disable-next-line no-loop-statement
	for (const address of delegateAddresses) {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').add(tx.fee).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes as string,
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
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

	// tslint:disable-next-line no-loop-statement
	for (const address of upvotes) {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').add(sender.balance).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes as string,
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
	// tslint:disable-next-line no-loop-statement
	for (const address of downvotes) {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0')
				.sub(sender.balance)
				.add(tx.fee)
				.toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes as string,
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
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
	// tslint:disable-next-line no-loop-statement
	for (const address of upvotes) {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(sender.balance).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes as string,
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
	// tslint:disable-next-line no-loop-statement
	for (const address of downvotes) {
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0')
				.add(sender.balance)
				.sub(tx.fee)
				.toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes as string,
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
};

export const applyVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<void> => {
	await applyFee(store, tx);
	await applyAmount(store, tx);
	await applyNewVote(store, tx);
};

export const undoVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<void> => {
	await undoFee(store, tx);
	await undoAmount(store, tx);
	await undoNewVote(store, tx);
};
