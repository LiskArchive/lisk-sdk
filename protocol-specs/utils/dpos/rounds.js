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

/* eslint-disable no-plusplus */

const {
	hash,
	getPrivateAndPublicKeyBytesFromPassphrase,
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
} = require('@liskhq/lisk-cryptography');
const { clone } = require('lodash');

const getKeysSortByVote = accountsState =>
	clone(accountsState)
		.filter(account => account.isDelegate)
		.sort((accountA, accountB) => {
			if (accountA.vote === accountB.vote) {
				return accountA.publicKey > accountB.publicKey;
			}
			return accountA.vote < accountB.vote;
		})
		.map(account => account.publicKey);

/**
 * Gets delegate list based on input function by vote and changes order.
 *
 * @param {number} round
 * @param {function} source - Source function for get delegates
 * @param {function} cb - Callback function
 * @param {Object} tx - Database transaction/task object
 * @returns {setImmediateCallback} cb, err, truncated delegate list
 * @todo Add description for the params
 */
const generateDelegateList = (accountsState, round) => {
	const truncDelegateList = getKeysSortByVote(accountsState);

	const seedSource = round.toString();
	let currentSeed = hash(seedSource, 'utf8');

	for (let i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
		for (let x = 0; x < 4 && i < delCount; i++, x++) {
			const newIndex = currentSeed[x] % delCount;
			const b = truncDelegateList[newIndex];
			truncDelegateList[newIndex] = truncDelegateList[i];
			truncDelegateList[i] = b;
		}
		currentSeed = hash(currentSeed);
	}

	return truncDelegateList;
};

const decryptKeypairs = config => {
	const encryptedList = config.forging.delegates;
	const password = config.forging.defaultPassword;

	const keypairs = {};

	// eslint-disable-next-line no-restricted-syntax
	for (const encryptedItem of encryptedList) {
		let passphrase;
		try {
			passphrase = decryptPassphraseWithPassword(
				parseEncryptedPassphrase(encryptedItem.encryptedPassphrase),
				password,
			);
		} catch (e) {
			throw new Error('Invalid password and public key combination');
		}

		const {
			publicKeyBytes,
			privateKeyBytes,
		} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);

		const keypair = {
			publicKey: publicKeyBytes,
			privateKey: privateKeyBytes,
		};

		if (keypair.publicKey.toString('hex') !== encryptedItem.publicKey) {
			throw `Invalid encryptedPassphrase for publicKey: ${
				encryptedItem.publicKey
			}. Public keys do not match`;
		}

		keypairs[keypair.publicKey.toString('hex')] = keypair;
	}

	return keypairs;
};

const getDelegateKeypairForCurrentSlot = (
	config,
	accountsState,
	currentSlot,
	round,
) => {
	const keypairs = decryptKeypairs(config);
	const activeDelegates = generateDelegateList(accountsState, round);

	const currentSlotIndex = currentSlot % config.constants.ACTIVE_DELEGATES;
	const currentSlotDelegate = activeDelegates[currentSlotIndex];

	if (currentSlotDelegate && keypairs[currentSlotDelegate]) {
		return keypairs[currentSlotDelegate];
	}

	return null;
};

module.exports = {
	getDelegateKeypairForCurrentSlot,
};
