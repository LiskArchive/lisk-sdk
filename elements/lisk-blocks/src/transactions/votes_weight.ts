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

import * as BigNum from '@liskhq/bignum';
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
	readonly amount: string | BigNum;
	readonly method: 'add' | 'sub';
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

const updateDelegateVote = (
	stateStore: StateStore,
	{ delegatePublicKey, amount, method }: DelegateCalculateInput,
) => {
	const delegateAddress = getAddressFromPublicKey(delegatePublicKey);
	const delegateAccount = stateStore.account.get(delegateAddress);
	const voteBigNum = new BigNum(delegateAccount.voteWeight || '0');
	const voteWeight = voteBigNum[method](amount).toString();
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

const updateRecipientDelegateVotes = (
	stateStore: StateStore,
	transaction: BaseTransaction,
	isUndo = false,
) => {
	const address = getRecipientAddress(stateStore, transaction);

	if (!address) {
		return false;
	}

	const account = stateStore.account.get(address);
	const method = isUndo ? 'sub' : 'add';
	const votedDelegatesPublicKeys = account.votedDelegatesPublicKeys || [];

	votedDelegatesPublicKeys.forEach(delegatePublicKey => {
		updateDelegateVote(stateStore, {
			delegatePublicKey,
			amount: (transaction.asset as TransferAsset).amount,
			method,
		});
	});

	return true;
};

const updateSenderDelegateVotes = (
	stateStore: StateStore,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions,
	isUndo = false,
) => {
	// Use the ammount or default to zero as LIP-0012 removes the 'amount' property from all transactions but transfer
	const amount = transaction.fee.plus(
		(transaction.asset as TransferAsset).amount || 0,
	);
	const method = isUndo ? 'add' : 'sub';
	const senderAccount = stateStore.account.getOrDefault(transaction.senderId);
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

	votedDelegatesPublicKeys.forEach(delegatePublicKey => {
		updateDelegateVote(stateStore, { delegatePublicKey, amount, method });
	});

	return true;
};

const updateDelegateVotes = (
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

	votes
		.map<DelegateCalculateInput>(vote => {
			const method = vote[0] === '+' ? 'add' : 'sub';
			const delegatePublicKey = vote.slice(1);

			const senderAccount = stateStore.account.get(transaction.senderId);
			const amount = new BigNum(senderAccount.balance).toString();

			return {
				delegatePublicKey,
				amount,
				method,
			};
		})
		.forEach(data => {
			updateDelegateVote(stateStore, data);
		});

	return true;
};

export const apply = (
	stateStore: StateStore,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	updateRecipientDelegateVotes(stateStore, transaction);
	updateSenderDelegateVotes(stateStore, transaction, exceptions);
	updateDelegateVotes(stateStore, transaction);
};

export const undo = (
	stateStore: StateStore,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	updateRecipientDelegateVotes(stateStore, transaction, true);
	updateSenderDelegateVotes(stateStore, transaction, exceptions, true);
	updateDelegateVotes(stateStore, transaction, true);
};

export const prepare = async (
	stateStore: StateStore,
	transactions: ReadonlyArray<BaseTransaction>,
) => {
	const publicKeys = transactions.map(transaction => {
		// Get delegate public keys whom sender voted for
		const senderVotedPublicKeys =
			stateStore.account.getOrDefault(transaction.senderId)
				.votedDelegatesPublicKeys || [];

		const recipientId = getRecipientAddress(stateStore, transaction);

		// Get delegate public keys whom recipient voted for
		const recipientVotedPublicKeys =
			(recipientId &&
				stateStore.account.getOrDefault(recipientId)
					.votedDelegatesPublicKeys) ||
			[];

		return {
			senderVotedPublicKeys,
			recipientVotedPublicKeys,
		};
	});

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
