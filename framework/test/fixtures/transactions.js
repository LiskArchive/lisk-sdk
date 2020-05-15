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

const randomstring = require('randomstring');
const faker = require('faker');
const stampit = require('stampit');
const Dapps = require('./dapps');

const Transaction = stampit({
	props: {
		id: '',
		height: 276,
		blockId: '',
		type: 0,
		nonce: '3',
		senderPublicKey:
			'ac81bb5fa789776e26120202e0c996eae6c1987055a1d837db3dc0f621ceeb66',
		senderId: '5797b0b4b9650d232cc919651f23e592746e3914',
		fee: '20000000',
		signatures: [
			'56a09d33ca4d19d9092ad764952d3c43fa575057b1078fc64875fcb50a1b1755230affc4665ff6a2de2671a5106cf0ae2d709e4f6e59d21c5cdc22f77060c506',
		],
		confirmations: 12,
		asset: null,
	},

	init({ id, blockId, type, asset, dapp, inTransfer, delegateName, votes }) {
		this.id = id || randomstring.generate({ length: 20, charset: 'numeric' });
		this.blockId =
			blockId || randomstring.generate({ charset: 'numeric', length: 20 });
		this.asset = asset || { data: 'extra information' };

		this.type = type || 8;

		switch (this.type) {
			// send
			case 8:
				this.asset.data = randomstring.generate({ length: 64 });
				this.asset.amount = '112340000';
				this.asset.recipientId = 'd04699e57c4a3846c988f3c15306796f8eae5c1c';
				break;

			// signature
			case 9:
				this.asset = {
					publicKey: randomstring.generate({
						charset: 'hex',
						length: 64,
						capitalization: 'lowercase',
					}),
				};
				break;

			// delegate
			case 10:
				this.asset = {
					username:
						delegateName ||
						randomstring.generate({ length: 10, charset: 'alphabetic' }),
				};
				break;

			// vote
			case 11:
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
				this.asset.amount = '112340000';
				this.asset.recipientId = 'd04699e57c4a3846c988f3c15306796f8eae5c1c';
				break;

			// multi
			case 12:
				this.asset = {
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

			// dapp
			case 5:
				this.asset.dapp = new Dapps.Dapp({ transactionId: this.id });
				break;

			// inTransfer
			case 6:
				this.asset.inTransfer = new Dapps.OutTransfer({
					dappId: dapp
						? dapp.id
						: randomstring.generate({ length: 20, charset: 'numeric' }),
					transactionId: this.id,
				});
				break;

			// outTransfer
			case 7:
				this.asset.outTransfer = new Dapps.OutTransfer({
					dappId: dapp
						? dapp.id
						: randomstring.generate({ length: 20, charset: 'numeric' }),
					transactionId: inTransfer
						? inTransfer.id
						: randomstring.generate({ length: 20, charset: 'numeric' }),
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
