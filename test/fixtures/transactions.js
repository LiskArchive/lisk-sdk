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
const faker = require('faker');
const stampit = require('stampit');
const transactionTypes = require('../../helpers/transaction_types');
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
		requesterPublicKey:
			'a0c4ebee8c0c50ebee32918655e089f6e1a604b83afa760367c61e0f18ac6a',
		senderId: '2525786814299543383L',
		recipientId: '16313739661670634666L',
		recipientPublicKey:
			'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
		amount: '112340000',
		fee: '20000000',
		signature:
			'56a09d33ca4d19d9092ad764952d3c43fa575057b1078fc64875fcb50a1b1755230affc4665ff6a2de2671a5106cf0ae2d709e4f6e59d21c5cdc22f77060c506',
		signSignature:
			'ab94afee7ec0c50ebee32918455e089f6e1a604a83bcaa760293c61e0f18ab6a',
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
			case transactionTypes.SEND:
				this.asset.data = randomstring.generate({ length: 64 });
				break;

			case transactionTypes.SIGNATURE:
				this.asset.signature = {
					publicKey: randomstring.generate({
						charset: 'hex',
						length: 64,
						capitalization: 'lowercase',
					}),
				};
				break;

			case transactionTypes.DELEGATE:
				this.asset.delegate = {
					username:
						delegateName ||
						randomstring.generate({ length: 10, charset: 'alphabetic' }),
				};
				break;

			case transactionTypes.VOTE:
				this.asset.votes = votes || [
					randomstring.generate({
						charset: 'hex',
						length: 64,
						capitalization: 'lowercase',
					}),
					randomstring.generate({
						charset: 'hex',
						length: 64,
						capitalization: 'lowercase',
					}),
				];
				break;

			case transactionTypes.MULTI:
				this.asset.multisignature = {
					min: faker.random.number({ min: 2 }),
					lifetime: +(new Date() / 1000).toFixed(),
					keysgroup: [
						randomstring.generate({
							charset: 'hex',
							length: 64,
							capitalization: 'lowercase',
						}),
						randomstring.generate({
							charset: 'hex',
							length: 64,
							capitalization: 'lowercase',
						}),
					],
				};
				break;

			case transactionTypes.DAPP:
				this.asset.dapp = Dapps.Dapp({ transactionId: this.id });
				break;

			case transactionTypes.IN_TRANSFER:
				this.asset.inTransfer = Dapps.OutTransfer({
					dappId: dapp
						? dapp.id
						: randomstring.generate({ length: 20, charset: 'numeric' }),
					transactionId: this.id,
				});
				break;

			case transactionTypes.OUT_TRANSFER:
				this.asset.outTransfer = Dapps.OutTransfer({
					dappId: dapp
						? dapp.id
						: randomstring.generate({ length: 20, charset: 'numeric' }),
					transactionId: inTransfer
						? inTransfer.id
						: randomstring.generate({ length: 20, charset: 'numeric' }),
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
