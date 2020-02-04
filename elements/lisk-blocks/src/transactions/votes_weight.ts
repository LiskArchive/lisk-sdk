/*
 * Copyright © 2018 Lisk Foundation
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

import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { BaseTransaction } from '@liskhq/lisk-transactions';

import { StateStore } from '../state_store';
import { ExceptionOptions } from '../types';

interface VoteAsset {
	readonly votes: ReadonlyArray<string>;
}

interface TransferAsset {
	readonly amount: string;
	readonly recipientId: string;
}

interface InTransferAsset {
	readonly inTransfer: {
		readonly dappId: string;
	};
}

interface DelegateCalculateInput {
	readonly delegatePublicKey: string;
	readonly amount: string | BigInt;
	readonly add: boolean;
}

// TODO: change to more generic way
/* tslint:disable:no-magic-numbers */
const TRANSACTION_TYPES_SEND = [0, 8];
const TRANSACTION_TYPES_VOTE = [3, 11];
const TRANSACTION_TYPES_IN_TRANSFER = [6];
const TRANSACTION_TYPES_OUT_TRANSFER = [7];
/* tslint:enable:no-magic-numbers */

const revertVotes = (votes: ReadonlyArray<string>) =>
	votes.map(vote => {
		const sign = vote[0] === '+' ? '-' : '+';

		return `${sign}${vote.slice(1)}`;
	});

const updateDelegateVote = async (
	stateStore: StateStore,
	{ delegatePublicKey, amount, add }: DelegateCalculateInput,
) => {
	const delegateAddress = getAddressFromPublicKey(delegatePublicKey);
	const delegateAccount = await stateStore.account.get(delegateAddress);
	const voteBigInt = delegateAccount.voteWeight || BigInt('0');
	const voteWeight = add
		? voteBigInt + BigInt(amount)
		: voteBigInt - BigInt(amount);

	delegateAccount.voteWeight = voteWeight;
	stateStore.account.set(delegateAddress, delegateAccount);
};

const getRecipientAddress = (
	stateStore: StateStore,
	transaction: BaseTransaction,
): string | undefined => {
	if (
		[
			...TRANSACTION_TYPES_SEND,
			...TRANSACTION_TYPES_OUT_TRANSFER,
			...TRANSACTION_TYPES_VOTE,
		].includes(transaction.type)
	) {
		return (transaction.asset as TransferAsset).recipientId;
	}

	/**
	 *  If transaction type is IN_TRANSFER then,
	 * `recipientId` is the owner of dappRegistration transaction
	 */
	if (TRANSACTION_TYPES_IN_TRANSFER.includes(transaction.type)) {
		const dappTransaction = stateStore.transaction.get(
			(transaction.asset as InTransferAsset).inTransfer.dappId,
		);

		return getAddressFromPublicKey(dappTransaction.senderPublicKey);
	}

	return undefined;
};

const revertVotedDelegatePublicKeys = (
	votedDelegatesPublicKeys: string[],
	transaction: BaseTransaction,
	isUndo = false,
) => {
	const newVotes = isUndo
		? revertVotes((transaction.asset as VoteAsset).votes)
		: (transaction.asset as VoteAsset).votes;
	const unvotedPublicKeys = newVotes
		.filter(vote => vote[0] === '-')
		.map(vote => vote.slice(1));
	const votedPublicKeys = newVotes
		.filter(vote => vote[0] === '+')
		.map(vote => vote.slice(1));

	/**
	 * We are returning the voted delegates from the time
	 * before this transaction was processed.
	 */
	return votedDelegatesPublicKeys
		.filter(vote => !votedPublicKeys.find(v => v === vote))
		.concat(unvotedPublicKeys);
};

const updateRecipientDelegateVotes = async (
	stateStore: StateStore,
	transaction: BaseTransaction,
	isUndo = false,
) => {
	const address = getRecipientAddress(stateStore, transaction);

	if (!address) {
		return false;
	}

	const account = await stateStore.account.get(address);
	const add = isUndo ? false : true;
	const votedDelegatesPublicKeys = account.votedDelegatesPublicKeys || [];

	for (const delegatePublicKey of votedDelegatesPublicKeys) {
		await updateDelegateVote(stateStore, {
			delegatePublicKey,
			amount: (transaction.asset as TransferAsset).amount,
			add,
		});
	}

	return true;
};

const updateSenderDelegateVotes = async (
	stateStore: StateStore,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions,
	isUndo = false,
) => {
	// Use the ammount or default to zero as LIP-0012 removes the 'amount' property from all transactions but transfer
	const amount =
		BigInt(transaction.fee) +
		BigInt((transaction.asset as TransferAsset).amount || 0);
	const add = isUndo ? true : false;
	const senderAccount = await stateStore.account.getOrDefault(
		transaction.senderId,
	);
	// tslint:disable-next-line no-let
	let votedDelegatesPublicKeys = senderAccount.votedDelegatesPublicKeys || [];

	/**
	 * In testnet, one vote transaction was not processed correctly.
	 * Vote changes in the asset field was not processed, and fees
	 * were deducted from previous delegates whom sender already voted for.
	 * Thus we don't need to execute `revertVotedDelegatePublicKeys` for that
	 * transaction!
	 *
	 * @todo Remove if condition when we have testnet
	 */
	if (
		TRANSACTION_TYPES_VOTE.includes(transaction.type) &&
		(!exceptions.roundVotes || !exceptions.roundVotes.includes(transaction.id))
	) {
		/**
		 * When a vote transaction was processed, *account.votedDelegatesPublicKeys* will be
		 * updated based on asset field of the vote transaction. However, in this function
		 * we would like to deduct *fees* from delegates whom sender voted before this transaction.
		 * Thus we revert voted delegate public keys list.
		 *
		 * PS: We'll process votes in asset field in `updateDelegateVotes` function.
		 */
		votedDelegatesPublicKeys = revertVotedDelegatePublicKeys(
			votedDelegatesPublicKeys,
			transaction,
			isUndo,
		);
	}

	for (const delegatePublicKey of votedDelegatesPublicKeys) {
		await updateDelegateVote(stateStore, { delegatePublicKey, amount, add });
	}

	return true;
};

const updateDelegateVotes = async (
	stateStore: StateStore,
	transaction: BaseTransaction,
	isUndo = false,
) => {
	/**
	 * If transaction is not VOTE transaction,
	 */
	if (!TRANSACTION_TYPES_VOTE.includes(transaction.type)) {
		return false;
	}

	const votes = isUndo
		? revertVotes((transaction.asset as VoteAsset).votes)
		: (transaction.asset as VoteAsset).votes;

	for (const vote of votes) {
		const add = vote[0] === '+' ? true : false;
		const delegatePublicKey = vote.slice(1);

		const senderAccount = await stateStore.account.get(transaction.senderId);
		const amount = senderAccount.balance.toString();

		await updateDelegateVote(stateStore, {
			delegatePublicKey,
			amount,
			add,
		});
	}

	return true;
};

export const apply = async (
	stateStore: StateStore,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	await updateRecipientDelegateVotes(stateStore, transaction);
	await updateSenderDelegateVotes(stateStore, transaction, exceptions);
	await updateDelegateVotes(stateStore, transaction);
};

export const undo = async (
	stateStore: StateStore,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	await updateRecipientDelegateVotes(stateStore, transaction, true);
	await updateSenderDelegateVotes(stateStore, transaction, exceptions, true);
	await updateDelegateVotes(stateStore, transaction, true);
};

export const prepare = async (
	stateStore: StateStore,
	transactions: ReadonlyArray<BaseTransaction>,
) => {
	const publicKeys = [];
	for (const transaction of transactions) {
		// Get delegate public keys whom sender voted for
		const senderVotedAccount = await stateStore.account.getOrDefault(
			transaction.senderId,
		);
		const senderVotedPublicKeys =
			senderVotedAccount.votedDelegatesPublicKeys || [];

		const recipientId = getRecipientAddress(stateStore, transaction);

		// Get delegate public keys whom recipient voted for
		const recipientVotedAccount =
			recipientId && (await stateStore.account.getOrDefault(recipientId));
		const recipientVotedPublicKeys =
			(recipientVotedAccount &&
				recipientVotedAccount.votedDelegatesPublicKeys) ||
			[];

		publicKeys.push({
			senderVotedPublicKeys,
			recipientVotedPublicKeys,
		});
	}

	const publicKeySet = new Set<string>();
	for (const publicKey of publicKeys) {
		for (const sender of publicKey.senderVotedPublicKeys) {
			publicKeySet.add(sender);
		}
		for (const recipient of publicKey.recipientVotedPublicKeys) {
			publicKeySet.add(recipient);
		}
	}

	// Get unique public key list from merged arrays
	const senderRecipientVotedPublicKeys = Array.from(publicKeySet);

	if (senderRecipientVotedPublicKeys.length === 0) {
		return true;
	}

	const cacheFilter = senderRecipientVotedPublicKeys.map(publicKey => ({
		address: getAddressFromPublicKey(publicKey),
	}));

	return stateStore.account.cache(cacheFilter);
};
