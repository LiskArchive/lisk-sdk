/*
 * Copyright © 2019 Lisk Foundation
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

const Bignumber = require('bignumber.js');

const { TRANSACTION_TYPES } = global.constants;
const exceptions = global.exceptions;

const reverseVotes = function(diff) {
	const copyDiff = diff.slice();
	for (let i = 0; i < copyDiff.length; i++) {
		const math = copyDiff[i][0] === '-' ? '+' : '-';
		copyDiff[i] = math + copyDiff[i].slice(1);
	}
	return copyDiff;
};

const updateRoundInformationWithDelegatesForTransaction = function(
	stateStore,
	transaction,
	forwardTick
) {
	if (transaction.type !== TRANSACTION_TYPES.VOTE) {
		return;
	}

	(forwardTick
		? transaction.asset.votes
		: reverseVotes(transaction.asset.votes)
	)
		.map(vote => {
			// Fetch first character
			const mode = vote[0];
			const dependentId = vote.slice(1);
			const balanceFactor = mode === '-' ? -1 : 1;
			const account = stateStore.account.get(transaction.senderId);

			// TODO: Core uses bignumber.js library and lisk-elements uses browserify-bignum. Their interface for multiplication are different
			// therefore we should pick one library and use it in both of the projects.
			const balance = new Bignumber(account.balance)
				.multipliedBy(balanceFactor)
				.toString();

			const roundData = {
				address: transaction.senderId,
				delegatePublicKey: dependentId,
				amount: balance,
			};

			return roundData;
		})
		.forEach(data => stateStore.round.add(data));
};

const updateSenderRoundInformationWithAmountForTransaction = function(
	stateStore,
	transaction,
	forwardTick
) {
	const amount = transaction.fee.plus(transaction.amount);
	const amountToUpdate = forwardTick
		? amount.mul(-1).toString()
		: amount.toString();
	const account = stateStore.account.get(transaction.senderId);
	let dependentPublicKeysToAdd = account.votedDelegatesPublicKeys || [];

	if (transaction.type === TRANSACTION_TYPES.VOTE) {
		const newVotes = forwardTick
			? transaction.asset.votes
			: reverseVotes(transaction.asset.votes);
		const downvotes = newVotes
			.filter(vote => vote[0] === '-')
			.map(vote => vote.slice(1));
		const upvotes = newVotes
			.filter(vote => vote[0] === '+')
			.map(vote => vote.slice(1));

		// Votes inside the transaction should not be incase it's an exception, but the existing votes should be updated
		if (!exceptions.roundVotes.includes(transaction.id)) {
			const dependentPublicKeysWithoutUpvotes = dependentPublicKeysToAdd.filter(
				vote => !upvotes.find(v => v === vote)
			);
			dependentPublicKeysToAdd = dependentPublicKeysWithoutUpvotes.concat(
				downvotes
			);
		}
	}

	if (dependentPublicKeysToAdd.length > 0) {
		dependentPublicKeysToAdd
			.map(delegatePublicKey => ({
				address: transaction.senderId,
				amount: amountToUpdate,
				delegatePublicKey,
			}))
			.forEach(data => stateStore.round.add(data));
	}
};

const updateRecipientRoundInformationWithAmountForTransaction = function(
	stateStore,
	transaction,
	forwardTick
) {
	let address;
	if (transaction.type === TRANSACTION_TYPES.IN_TRANSFER) {
		const dappTransaction = stateStore.transaction.get(
			transaction.asset.inTransfer.dappId
		);
		address = dappTransaction.senderId;
	}
	if (
		transaction.type === TRANSACTION_TYPES.SEND ||
		transaction.type === TRANSACTION_TYPES.OUT_TRANSFER ||
		transaction.type === TRANSACTION_TYPES.VOTE
	) {
		address = transaction.recipientId;
	}

	if (!address) {
		return;
	}

	const account = stateStore.account.get(address);
	const amount = transaction.amount;
	const amountToUpdate = forwardTick
		? amount.toString()
		: amount.mul(-1).toString();

	if (account.votedDelegatesPublicKeys) {
		account.votedDelegatesPublicKeys
			.map(delegatePublicKey => ({
				address,
				amount: amountToUpdate,
				delegatePublicKey,
			}))
			.forEach(data => stateStore.round.add(data));
	}
};

module.exports = {
	apply(stateStore, transaction) {
		const isForwardTick = true;
		updateRecipientRoundInformationWithAmountForTransaction(
			stateStore,
			transaction,
			isForwardTick
		);
		updateSenderRoundInformationWithAmountForTransaction(
			stateStore,
			transaction,
			isForwardTick
		);
		updateRoundInformationWithDelegatesForTransaction(
			stateStore,
			transaction,
			isForwardTick
		);
	},

	undo(stateStore, transaction) {
		const isForwardTick = false;
		updateRecipientRoundInformationWithAmountForTransaction(
			stateStore,
			transaction,
			isForwardTick
		);
		updateSenderRoundInformationWithAmountForTransaction(
			stateStore,
			transaction,
			isForwardTick
		);
		updateRoundInformationWithDelegatesForTransaction(
			stateStore,
			transaction,
			isForwardTick
		);
	},
};
