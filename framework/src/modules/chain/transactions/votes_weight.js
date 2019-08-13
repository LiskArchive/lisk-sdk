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

'use strict';

const BigNum = require('@liskhq/bignum');
const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');

// TODO: change to more generic way
const TRANSACTION_TYPES_SEND = 0;
const TRANSACTION_TYPES_VOTE = 3;
const TRANSACTION_TYPES_IN_TRANSFER = 6;
const TRANSACTION_TYPES_OUT_TRANSFER = 7;

const revertVotes = votes =>
	votes.map(vote => {
		const sign = vote[0] === '+' ? '-' : '+';
		return `${sign}${vote.slice(1)}`;
	});

const updateDelegateVote = (
	stateStore,
	{ delegatePublicKey, amount, method },
) => {
	const delegateAddress = getAddressFromPublicKey(delegatePublicKey);
	const delegateAccount = stateStore.account.get(delegateAddress);
	const voteBigNum = new BigNum(delegateAccount.voteWeightReceived || '0');
	const voteWeightReceived = voteBigNum[method](amount).toString();
	const updatedDelegateAccount = {
		...delegateAccount,
		voteWeightReceived,
	};
	stateStore.account.set(delegateAddress, updatedDelegateAccount);
};

const getRecipientAddress = (stateStore, transaction) => {
	/**
	 *  If transaction type is IN_TRANSFER then,
	 * `recipientId` is the owner of dappRegistration transaction
	 */
	if (transaction.type === TRANSACTION_TYPES_IN_TRANSFER) {
		const dappTransaction = stateStore.transaction.get(
			transaction.asset.inTransfer.dappId,
		);
		return dappTransaction.senderId;
	}
	if (
		transaction.type === TRANSACTION_TYPES_SEND ||
		transaction.type === TRANSACTION_TYPES_OUT_TRANSFER ||
		transaction.type === TRANSACTION_TYPES_VOTE
	) {
		return transaction.recipientId;
	}

	return null;
};

const revertVotedDelegatePublicKeys = (
	votedDelegatesPublicKeys,
	transaction,
	undo = false,
) => {
	const newVotes = undo
		? revertVotes(transaction.asset.votes)
		: transaction.asset.votes;
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
	stateStore,
	transaction,
	undo = false,
) => {
	const address = getRecipientAddress(stateStore, transaction);

	if (!address) {
		return false;
	}

	const { amount } = transaction;
	const account = stateStore.account.get(address);
	const method = undo ? 'sub' : 'add';
	const votedDelegatesPublicKeys = account.votedDelegatesPublicKeys || [];

	return votedDelegatesPublicKeys
		.map(delegatePublicKey => ({
			delegatePublicKey,
			amount,
			method,
		}))
		.forEach(data => updateDelegateVote(stateStore, data));
};

const updateSenderDelegateVotes = (
	stateStore,
	transaction,
	exceptions,
	undo = false,
) => {
	const amount = transaction.fee.plus(transaction.amount);
	const method = undo ? 'add' : 'sub';
	const senderAccount = stateStore.account.getOrDefault(transaction.senderId);
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
		transaction.type === TRANSACTION_TYPES_VOTE &&
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
			undo,
		);
	}

	return votedDelegatesPublicKeys
		.map(delegatePublicKey => ({
			delegatePublicKey,
			amount,
			method,
		}))
		.forEach(data => updateDelegateVote(stateStore, data));
};

const updateDelegateVotes = (stateStore, transaction, undo = false) => {
	/**
	 * If transaction is not VOTE transaction,
	 */
	if (transaction.type !== TRANSACTION_TYPES_VOTE) {
		return false;
	}

	const votes = undo
		? revertVotes(transaction.asset.votes)
		: transaction.asset.votes;

	return votes
		.map(vote => {
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
		.forEach(data => updateDelegateVote(stateStore, data));
};

const apply = (stateStore, transaction, exceptions = {}) => {
	updateRecipientDelegateVotes(stateStore, transaction);
	updateSenderDelegateVotes(stateStore, transaction, exceptions);
	updateDelegateVotes(stateStore, transaction);
};

const undo = (stateStore, transaction, exceptions = {}) => {
	updateRecipientDelegateVotes(stateStore, transaction, true);
	updateSenderDelegateVotes(stateStore, transaction, exceptions, true);
	updateDelegateVotes(stateStore, transaction, true);
};

const prepare = async (stateStore, transaction) => {
	// Get delegate public keys whom sender voted for
	const senderDelegatePks =
		stateStore.account.getOrDefault(transaction.senderId)
			.votedDelegatesPublicKeys || [];

	const recipientId = getRecipientAddress(stateStore, transaction);

	// Get delegate public keys whom recipient voted for
	const recipientDelegatePks = recipientId
		? stateStore.account.getOrDefault(recipientId).votedDelegatesPublicKeys ||
		  []
		: [];

	// Get unique public keys from merged list
	const uniqPksToBeCached = [
		...new Set([...senderDelegatePks, ...recipientDelegatePks]),
	];

	const addressesToBeCached = uniqPksToBeCached
		// format items for filtering in cache function
		.map(delegatePk => ({
			address: getAddressFromPublicKey(delegatePk),
		}));

	return stateStore.account.cache(addressesToBeCached);
};

module.exports = {
	updateRecipientDelegateVotes,
	updateSenderDelegateVotes,
	updateDelegateVotes,
	apply,
	undo,
	prepare,
};
