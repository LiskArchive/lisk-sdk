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

require('../../functional.js');
const { transfer } = require('@liskhq/lisk-transactions');
const WAMPServer = require('wamp-socket-cluster/WAMPServer');
const phases = require('../../../common/phases');
const randomUtil = require('../../../common/utils/random');
const wsRPC = require('../../../../../src/modules/chain/api/ws/rpc/ws_rpc')
	.wsRPC;
const WsTestClient = require('../../../common/ws/client');

describe('Posting transaction (type 0)', () => {
	let transaction;
	const goodTransactions = [];
	const badTransactions = [];
	const account = randomUtil.account();
	let wsTestClient;

	function postTransaction(transactionToPost) {
		wsTestClient.client.rpc.postTransactions({
			transactions: [transactionToPost],
		});
	}

	before('establish client WS connection to server', done => {
		// Setup stub for post transactions endpoint
		const wampServer = new WAMPServer();
		wampServer.registerEventEndpoints({
			postTransactions: async () => {},
			updateMyself: async () => {},
		});
		wsRPC.setServer(wampServer);
		// Register client
		wsTestClient = new WsTestClient();
		wsTestClient.start();
		done();
	});

	beforeEach(done => {
		transaction = randomUtil.transaction();
		done();
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
