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

var randomstring = require('randomstring');
var lisk = require('lisk-js');

var constants = require('../../../helpers/constants');

var accountFixtures = require('../../fixtures/accounts');

var random = {};

// Returns a random number between min (inclusive) and max (exclusive)
random.number = function(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
};

// Returns the expected fee for the given amount with data property
random.expectedFeeForTransactionWithData = function() {
	return parseInt(constants.fees.transaction) + parseInt(constants.fees.data);
};

// Returns a random username of 16 characters
random.username = function() {
	var randomLetter = randomstring.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase',
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = randomstring.generate({
		length: 15,
		charset: custom,
	});

	return randomLetter.concat(username);
};

// Returns a random delegate name of 20 characters
random.delegateName = function() {
	var randomLetter = randomstring.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase',
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = randomstring.generate({
		length: 19,
		charset: custom,
	});

	return randomLetter.concat(username);
};

// Returns a random application name of 32 characteres
random.applicationName = function() {
	var custom = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	return randomstring.generate({
		length: random.number(5, 32),
		charset: custom,
	});
};

// Test random application
random.application = function() {
	var application = {
		category: random.number(0, 9),
		name: random.applicationName(),
		description: 'Blockchain based home monitoring tool',
		tags: 'monitoring temperature power sidechain',
		type: random.number(0, 2),
		link: `https://${random.applicationName()}.zip`,
		icon:
			'https://raw.githubusercontent.com/MaxKK/blockDataDapp/master/icon.png',
	};

	return application;
};

// Test applications
random.guestbookDapp = random.application();
random.blockDataDapp = random.application();

// Returns a basic random account
random.account = function() {
	var account = {
		balance: '0',
	};

	account.password = random.password();
	account.secondPassword = random.password();
	account.username = random.delegateName();
	account.publicKey = lisk.crypto.getKeys(account.password).publicKey;
	account.address = lisk.crypto.getAddress(account.publicKey);
	account.secondPublicKey = lisk.crypto.getKeys(
		account.secondPassword
	).publicKey;

	return account;
};

// Returns an random basic transaction to send 1 LSK from genesis account to a random account
random.transaction = function(offset) {
	return lisk.transaction.createTransaction(
		random.account().address,
		1,
		accountFixtures.genesis.password,
		offset
	);
};

// Returns a random password
random.password = function() {
	return Math.random()
		.toString(36)
		.substring(7);
};

module.exports = random;
