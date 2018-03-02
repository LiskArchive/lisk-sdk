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

const randomstring = require('randomstring');
const stampit = require('stampit');
const Dapps = require('./dapps');

const Transaction = stampit({
	props: {
		id: '',
		height: 276,
		blockId: '',
		type: 0,
		timestamp: 40080841,
		senderPublicKey:
			'ac81bb5fa789776e26120202e0c996eae6c1987055a1d837db3dc0f621ceeb66',
		requesterPublicKey: undefined,
		senderId: '2525786814299543383L',
		recipientId: '16313739661670634666L',
		recipientPublicKey:
			'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
		amount: 112340000,
		fee: 20000000,
		signature:
			'56a09d33ca4d19d9092ad764952d3c43fa575057b1078fc64875fcb50a1b1755230affc4665ff6a2de2671a5106cf0ae2d709e4f6e59d21c5cdc22f77060c506',
		signSignature: undefined,
		signatures: [],
		confirmations: 12,
		asset: null,
	},

	init({ id, blockId, type, asset, dapp, inTransfer, delegateName, votes }) {
		this.id = id || randomstring.generate({ length: 20, charset: 'numeric' });
		this.blockId =
			blockId || randomstring.generate({ charset: 'numeric', length: 20 });
		this.asset = asset || { data: 'extra information' };

		this.type = type || 0;

		switch (this.type) {
			case 2:
				this.asset.delegate.username = delegateName || 'DummyDelegate';
				break;

			case 3:
				this.asset.votes = votes || [];
				break;

			case 5:
				this.asset.dapp = Dapps.Dapp({ transactionId: this.id });
				break;

			case 6:
				this.asset.inTransfer = Dapps.OutTransfer({
					dappId: dapp.id,
					transactionId: this.id,
				});
				break;

			case 7:
				this.asset.outTransfer = Dapps.OutTransfer({
					dappId: dapp.id,
					transactionId: inTransfer.id,
					outTransactionId: this.id,
				});
				break;

			default:
				break;
		}
	},
});

module.exports = {
	Transaction,
};
