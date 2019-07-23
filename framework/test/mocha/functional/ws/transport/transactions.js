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

require('../../functional');
const { P2P } = require('@liskhq/lisk-p2p');
const { transfer } = require('@liskhq/lisk-transactions');
const phases = require('../../../common/phases');
const randomUtil = require('../../../common/utils/random');
const { generatePeerHeader } = require('../../../common/generatePeerHeader');

describe('Posting transaction (type 0)', () => {
	let transaction;
	const goodTransactions = [];
	const badTransactions = [];
	const account = randomUtil.account();
	let p2p;

	function postTransaction(transactionToPost) {
		p2p.send({
			event: 'postTransactions',
			data: {
				nonce: 'sYHEDBKcScaAAAYg',
				transactions: [transactionToPost],
			},
		});
	}

	before('establish client WS connection to server', async () => {
		p2p = new P2P(generatePeerHeader());
		await p2p.start();
	});

	after(async () => {
		await p2p.stop();
	});

	beforeEach(async () => {
		transaction = randomUtil.transaction();
	});

	describe('transaction processing', () => {
		it('when sender has no funds should broadcast transaction but not confirm', done => {
			transaction = transfer({
				amount: '1',
				passphrase: account.passphrase,
				recipientId: '1L',
			});

			postTransaction(transaction);
			badTransactions.push(transaction);
			done();
		});

		it('when sender has funds should broadcast transaction and confirm', done => {
			postTransaction(transaction);
			goodTransactions.push(transaction);
			done();
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});
});
