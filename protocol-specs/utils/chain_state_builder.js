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

const {
	createSignatureObject,
	TransferTransaction,
	registerDelegate,
	DelegateTransaction,
	VoteTransaction,
	castVotes,
	MultisignatureTransaction,
	registerMultisignature: registerMultisignatureLisk,
} = require('@liskhq/lisk-transactions');
const {
	getAddressFromPrivateKey,
	getPrivateAndPublicKeyFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const { Mnemonic } = require('@liskhq/lisk-passphrase');

const { cloneDeep } = require('lodash');
const BigNum = require('@liskhq/bignum');

const { createBlock } = require('./blocks');
const defaultConfig = require('../config/devnet');

class ChainStateBuilder {
	constructor(
		genesisBlock,
		initialAccountsStates,
		accounts,
		includeGenesisBlockInState = false,
	) {
		this.genesisBlock = genesisBlock;
		this.previousBlock = genesisBlock;
		this.state = {
			chain: includeGenesisBlockInState ? [this.genesisBlock] : [],
			accounts: cloneDeep(accounts),
			accountStore: [cloneDeep(initialAccountsStates)],
			initialAccountStore: cloneDeep(initialAccountsStates),
			pendingTransactions: [],
			appliedTransactions: [],
			inputBlock: [],
		};
		this.round = 0;
		this.slot = 0;
		this.fixedPoint = 10 ** 8;
		this.fees = {
			transfer: this.fixedPoint * 0.1,
			signature: this.fixedPoint * 5,
			delegate: this.fixedPoint * 25,
			vote: this.fixedPoint * 1,
			multisignature: this.fixedPoint * 5,
		};
		this.lastTransactionId = null;
		this.timestamp = 102702700;
	}

	transfer(amount) {
		return {
			from: addressFrom => ({
				to: addressTo => {
					const amountBeddows = `${amount * this.fixedPoint}`;

					const transferTx = new TransferTransaction({
						amount: amountBeddows,
						recipientId: Object.values(this.state.accounts).find(
							anAccount => anAccount.address === addressTo,
						).address,
						timestamp: this.timestamp,
					});

					transferTx.sign(
						Object.values(this.state.accounts).find(
							anAccount => anAccount.address === addressFrom,
						).passphrase,
					);
					// Push it to pending transaction
					this.state.pendingTransactions.push(transferTx);
					this.lastTransactionId = transferTx._id;
					return this;
				},
			}),
		};
	}

	registerDelegate(delegateName) {
		return {
			for: delegateAddress => {
				const registerDelegateTx = new DelegateTransaction(
					registerDelegate({
						username: delegateName,
						passphrase: Object.values(this.state.accounts).find(
							anAccount => anAccount.address === delegateAddress,
						).passphrase,
					}),
				);
				// Push it to pending transaction
				this.state.pendingTransactions.push(registerDelegateTx);
				this.lastTransactionId = registerDelegateTx._id;
				return this;
			},
		};
	}

	// eslint-disable-next-line class-methods-use-this
	registerMultisignature(address) {
		const members = [];

		const finish = () => {
			// Extract main account info
			const targetAccount = this.findAccountByAddress(
				address,
				Object.values(this.state.accounts),
			);
			// Extract members info
			const membersAccounts = [];
			// eslint-disable-next-line no-restricted-syntax
			for (const aMemberAddress of members) {
				const thisMember = this.findAccountByAddress(
					aMemberAddress,
					Object.values(this.state.accounts),
				);
				if (!thisMember) {
					throw new Error(
						'One of the members for a Multisignature Transaction was not found. Check your initial account setup. Make sure all members exist',
					);
				}
				membersAccounts.push(thisMember);
			}
			// Create basic multisignature object
			const multisignatureObject = registerMultisignatureLisk({
				passphrase: targetAccount.passphrase,
				lifetime: 1,
				minimum: membersAccounts.length,
				keysgroup: membersAccounts.map(aMember => aMember.publicKey),
			});
			// Create a multisignature instance
			const multisignatureTXInstance = new MultisignatureTransaction(
				multisignatureObject,
			);
			// Add the signatures for each member
			// eslint-disable-next-line no-restricted-syntax
			for (const aMemberAccount of membersAccounts) {
				const aSigObject = createSignatureObject(
					multisignatureObject,
					aMemberAccount.passphrase,
				);
				multisignatureTXInstance.addMultisignature(null, aSigObject);
			}
			// Push it to the pending
			this.state.pendingTransactions.push(multisignatureTXInstance);
			this.lastTransactionId = multisignatureTXInstance._id;
			return this;
		};

		const addMemberAndSign = aMember => {
			members.push(aMember);
			return { finish, addMemberAndSign };
		};

		return {
			addMemberAndSign,
		};
	}

	// This method adds signatures ONLY too the last transaction sent
	signTransaction(transactionId) {
		const transactionToBeSigned = this.state.pendingTransactions.find(
			aTransaction => aTransaction.id === transactionId,
		);

		if (!transactionToBeSigned) {
			throw new Error(
				'The provided transaction id was not found make sure you are callign `signTransaction` correctly.',
			);
		}

		return {
			withAccount: signerAccountAddress => {
				const accountStore = Object.values(this.state.accounts);
				const signerAccount = accountStore.find(
					anAccount => anAccount.address === signerAccountAddress,
				);
				if (!signerAccount) {
					throw new Error(
						'Signer account not found make sure the account exists on your intial account state.',
					);
				}
				const transactionSignature = createSignatureObject(
					transactionToBeSigned.toJSON(),
					signerAccount.passphrase,
				);

				transactionToBeSigned.signatures.push(transactionSignature.signature);
				return this;
			},
		};
	}

	castVotesFrom(votingAccountAddress) {
		return {
			voteDelegates: votedDelegates => ({
				unvoteDelegates: unvotedDelegates => {
					if (votedDelegates.length + unvotedDelegates.length > 33) {
						// eslint-disable-next-line no-console
						console.log(
							`WARNING: you included '${votedDelegates.length +
								unvotedDelegates.length}' votes in a vote transaction. This is only valid for simulating invalid scenarios!`,
						);
					}
					// Get the account that's voting
					const votingAccount = this.findAccountByAddress(
						votingAccountAddress,
						Object.values(this.state.accounts),
					);

					// Create the JSON for the vote transaction
					const castVotesObject = castVotes({
						passphrase: votingAccount.passphrase,
						votes: votedDelegates,
						unvotes: unvotedDelegates,
					});
					// Create vote transaction instance
					const voteInstance = new VoteTransaction(castVotesObject);

					this.state.pendingTransactions.push(voteInstance);
					return this;
				},
			}),
		};
	}

	forge() {
		const latestsAccountState = this.state.accountStore.slice(-1)[0];
		this.processBlockTransactions(this.state.pendingTransactions);

		const newBlock = createBlock(
			defaultConfig,
			latestsAccountState,
			this.previousBlock,
			this.round,
			this.slot,
			{
				version: 1,
				transactions: [...this.state.pendingTransactions],
			},
		);

		this.state.chain.push(newBlock);
		this.previousBlock = newBlock;
		this.state.appliedTransactions.push([...this.state.pendingTransactions]);
		this.state.pendingTransactions = [];
		return this;
	}

	forgeInvalidInputBlock() {
		const latestsAccountState = this.state.accountStore.slice(-1)[0];

		const newBlock = createBlock(
			defaultConfig,
			latestsAccountState,
			this.previousBlock,
			this.round,
			this.slot,
			{
				version: 1,
				transactions: [...this.state.pendingTransactions],
			},
		);

		this.state.inputBlock.push(newBlock);
		this.state.appliedTransactions.push(...this.state.pendingTransactions);
		this.state.pendingTransactions = [];
		return this;
	}

	processBlockTransactions() {
		// eslint-disable-next-line no-restricted-syntax
		for (const aTransaction of this.state.pendingTransactions) {
			switch (aTransaction.type) {
				case 0:
					this.updateAccountBalancesAfterTransfer(
						aTransaction.senderId,
						aTransaction.recipientId,
						aTransaction.amount.toString(),
					);
					break;
				case 2:
					this.updateAccountStateAfterDelegateRegistration(
						aTransaction.senderId,
						this.fees.delegate,
						aTransaction.asset.delegate.username,
					);
					break;
				case 3:
					this.updateAccountStateAfterCastingvotes(aTransaction);
					break;
				case 4:
					this.updateAccountStateAfterMultisignatureRegistration(aTransaction);
					break;
				default:
					break;
			}
		}
		return this;
	}

	getScenario() {
		return {
			initialAccountsState: this.state.initialAccountStore,
			finalAccountsState: this.state.accountStore,
			chain: this.state.chain,
			inputBlock: this.state.inputBlock,
		};
	}

	updateAccountBalancesAfterTransfer(from, to, amount) {
		const newAccountStoreState = cloneDeep(
			this.state.accountStore.slice(-1)[0],
		);
		const sender = this.findAccountByAddress(from, newAccountStoreState);
		const recipient = this.findAccountByAddress(to, newAccountStoreState);

		if (!sender) {
			throw new Error(
				'Sender does not exists so it would not be possible to transfer from this account. Check the values passed to the constructor',
			);
		}

		if (!sender && !recipient) {
			throw new Error(
				'Both sender and recipient were not found in the account store state. This means that something is wrong with the values passed to the constructor.',
			);
		}

		// Update sender balance
		sender.balance = new BigNum(sender.balance.toString())
			.sub(amount)
			.sub(this.fees.transfer)
			.toString();

		// If recipient does not exists create the account
		if (!recipient) {
			const newAccount = this.newAccountFromTemplate(
				Object.values(this.state.accounts).find(
					anAccount => anAccount.address === to,
				),
			);
			newAccount.balance = new BigNum(newAccount.balance.toString())
				.add(amount)
				.toString();
			newAccountStoreState.push(newAccount);
		} else {
			recipient.balance = new BigNum(recipient.balance.toString())
				.add(amount)
				.toString();
		}

		this.state.accountStore.push(newAccountStoreState);
	}

	updateAccountStateAfterDelegateRegistration(from, amount, delegateName) {
		const newAccountStoreState = cloneDeep(
			this.state.accountStore.slice(-1)[0],
		);

		const sender = this.findAccountByAddress(from, newAccountStoreState);

		if (!sender) {
			throw new Error(
				'Sender does not exists so it would not be possible to transfer from this account. Check the values passed to the constructor',
			);
		}
		// Update sender balance
		sender.balance = new BigNum(sender.balance.toString())
			.sub(amount)
			.toString();
		sender.username = delegateName;
		sender.isDelegate = true;

		this.state.accountStore.push(newAccountStoreState);
	}

	updateAccountStateAfterMultisignatureRegistration(multisignatureTransaction) {
		const newAccountStoreState = cloneDeep(
			this.state.accountStore.slice(-1)[0],
		);
		// Update sender balance
		const sender = this.findAccountByAddress(
			multisignatureTransaction._senderId,
			newAccountStoreState,
		);
		sender.balance = new BigNum(sender.balance.toString())
			.sub(multisignatureTransaction.fee)
			.toString();
		sender.multiMin = multisignatureTransaction.asset.multisignature.min;
		sender.multiLifetime =
			multisignatureTransaction.asset.multisignature.lifetime;
		this.state.accountStore.push(newAccountStoreState);
	}

	updateAccountStateAfterCastingvotes(castVotesTransaction) {
		const newAccountStoreState = cloneDeep(
			this.state.accountStore.slice(-1)[0],
		);

		// Update sender balance
		const sender = this.findAccountByAddress(
			castVotesTransaction._senderId,
			newAccountStoreState,
		);
		sender.balance = new BigNum(sender.balance.toString())
			.sub(castVotesTransaction.fee)
			.toString();
		// Extract voted publicKeys from vote transaction
		// eslint-disable-next-line no-restricted-syntax
		for (const aVotedPublicKey of castVotesTransaction.asset.votes) {
			const action = aVotedPublicKey.slice(0, 1);
			const publickKey = aVotedPublicKey.slice(1);
			const affectedAccount = newAccountStoreState.find(
				anAccount => anAccount.publicKey === publickKey,
			);

			if (action === '+') {
				affectedAccount.vote = new BigNum(affectedAccount.vote)
					.plus(sender.balance)
					.toString();
			} else {
				affectedAccount.vote = new BigNum(affectedAccount.vote)
					.sub(sender.balance)
					.toString();
			}
		}

		// Finally push all updates to the account store
		this.state.accountStore.push(newAccountStoreState);
	}

	// eslint-disable-next-line
	findAccountByAddress(address, collection) {
		return collection.find(anAccount => anAccount.address === address);
	}

	// eslint-disable-next-line
	newAccountFromTemplate(account) {
		return {
			address: account.address,
			publicKey: account.publicKey,
			secondPublicKey: null,
			username: '',
			isDelegate: false,
			secondSignature: false,
			balance: 0,
			multiMin: 0,
			multiLifetime: 0,
			nameExist: false,
			missedBlocks: 0,
			producedBlocks: 0,
			rank: 0,
			fees: 0,
			rewards: 0,
			vote: 0,
			productivity: 0,
		};
	}

	static createAccount() {
		const passphrase = Mnemonic.generateMnemonic();
		const keys = getPrivateAndPublicKeyFromPassphrase(passphrase);
		const address = getAddressFromPrivateKey(keys.privateKey);

		return {
			passphrase,
			privateKey: keys.privateKey,
			publicKey: keys.publicKey,
			address,
			balance: '0',
		};
	}
}

module.exports = ChainStateBuilder;
