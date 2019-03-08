import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import { debug } from 'debug';
import { Account } from './account';
import {
	MAX_DIGITS,
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

const logger = debug('blockchain:vote');
const candidateKey = (weight: string, publicKey: string): string =>
	`${weight.padStart(MAX_DIGITS, '0')}:${publicKey}`;

const updateCandidateKey = async (
	store: StateStore,
	oldWeight: string,
	newWeight: string,
	address: string,
	publicKey: string,
) => {
	const oldKey = candidateKey(oldWeight, publicKey);
	const newKey = candidateKey(newWeight, publicKey);
	logger('Replacing', { oldKey, newKey, address });

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
	// Handle sender amount
	const sender = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, tx.senderId);
	const senderDelegateAddresses = sender.votedDelegatesPublicKeys
		? sender.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	// tslint:disable-next-line no-loop-statement
	for (const address of senderDelegateAddresses) {
		logger('apply amount for sender', {
			to: address,
			amount: tx.amount.toString(),
		});

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
	// Handle recipient amount
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
	logger('recipient for apply amount', { recipient });
	const recipientDelegateAddresses = recipient.votedDelegatesPublicKeys
		? recipient.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	// tslint:disable-next-line no-loop-statement
	for (const address of recipientDelegateAddresses) {
		logger('apply amount', { to: address, amount: tx.amount.toString() });

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
	// Handle sender amount
	const sender = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, tx.senderId);
	const senderDelegateAddresses = sender.votedDelegatesPublicKeys
		? sender.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	// tslint:disable-next-line no-loop-statement
	for (const address of senderDelegateAddresses) {
		logger('apply amount for sender', {
			to: address,
			amount: tx.amount.toString(),
		});

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
	const recipientDelegateAddresses = recipient.votedDelegatesPublicKeys
		? recipient.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
		: [];
	// tslint:disable-next-line no-loop-statement
	for (const address of recipientDelegateAddresses) {
		logger('undo amount', { address });
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
	logger('apply fee for sender with id', {
		sender: sender.address,
		delegates: delegateAddresses,
		id: tx.id,
	});
	// tslint:disable-next-line no-loop-statement
	for (const address of delegateAddresses) {
		logger('apply fee', { address, fee: tx.fee.toString() });
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(tx.fee).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes || '0',
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
		logger('undo fee', { address });
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').add(tx.fee).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes || '0',
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
		logger('apply new upvote', { address });
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0')
				.add(sender.balance)
				.add(tx.fee)
				.toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes || '0',
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
	// tslint:disable-next-line no-loop-statement
	for (const address of downvotes) {
		logger('apply new downvote', { address });
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(sender.balance).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes || '0',
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
		logger('undo new upvote', { address });
		const delegate = await store.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);
		const updateDelegateVote = {
			...delegate,
			votes: new BigNum(delegate.votes || '0').sub(sender.balance).toString(),
		};
		await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);

		await updateCandidateKey(
			store,
			delegate.votes || '0',
			updateDelegateVote.votes,
			delegate.address,
			delegate.publicKey as string,
		);
	}
	// tslint:disable-next-line no-loop-statement
	for (const address of downvotes) {
		logger('undo new downvote', { address });
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
			delegate.votes || '0',
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
	await applyNewVote(store, tx);
	await applyAmount(store, tx);
	await applyFee(store, tx);
};

export const undoVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<void> => {
	await undoFee(store, tx);
	await undoAmount(store, tx);
	await undoNewVote(store, tx);
};
