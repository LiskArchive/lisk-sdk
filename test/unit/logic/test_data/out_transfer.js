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

var crypto = require('crypto');
var ed = require('../../../../helpers/ed');

var validPassphrase = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassphrase, 'utf8')
		.digest()
);

var validSender = {
	passphrase: '1vi3igdedurk9ctbj4i',
	secondPassphrase: 'lpdrphar6g5fcac3di',
	username: 'p1obslna292ypj',
	publicKey: '8d556dca10bb8294895df5477117ca2ceaae7795e7ffc4f7c7d51398a65e4911',
	address: '12566082625150495618L',
	secondPublicKey:
		'32f8c9b4b674c027de01fa685596bdc4ed07caabf6ecac3a8273be6fc4cbe842',
};
var validTransaction = {
	id: '12010334009048463571',
	height: 382,
	blockId: '7608840392099654665',
	type: 7,
	timestamp: 41287231,
	senderPublicKey:
		'8d556dca10bb8294895df5477117ca2ceaae7795e7ffc4f7c7d51398a65e4911',
	requesterPublicKey: undefined,
	senderId: '12566082625150495618L',
	recipientId: '477547807936790449L',
	recipientPublicKey: null,
	amount: 100,
	fee: 10000000,
	signature:
		'126de9603da232b0ada5158c43640849a62736351be1f39cd98606f6d81bedff895183f12c517c96dcc71368af111e7ddde04f62c54ecd1ea47d557af69f330d',
	signSignature: undefined,
	signatures: [],
	confirmations: 12,
	asset: {
		outTransfer: {
			dappId: '4163713078266524209',
			transactionId: '14144353162277138821',
		},
	},
};

var rawValidTransaction = {
	t_id: '12010334009048463571',
	b_height: 382,
	t_blockId: '7608840392099654665',
	t_type: 7,
	t_timestamp: 41287231,
	t_senderPublicKey:
		'8d556dca10bb8294895df5477117ca2ceaae7795e7ffc4f7c7d51398a65e4911',
	m_recipientPublicKey: null,
	t_senderId: '12566082625150495618L',
	t_recipientId: '477547807936790449L',
	t_amount: '100',
	t_fee: '10000000',
	t_signature:
		'126de9603da232b0ada5158c43640849a62736351be1f39cd98606f6d81bedff895183f12c517c96dcc71368af111e7ddde04f62c54ecd1ea47d557af69f330d',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 12,
	ot_dappId: '4163713078266524209',
	ot_outTransactionId: '14144353162277138821',
};

var validGetGensisResult = {
	authorId: 'validAuthorId',
};

var senderHash = crypto
	.createHash('sha256')
	.update(validSender.passphrase, 'utf8')
	.digest();
var senderKeypair = ed.makeKeypair(senderHash);

module.exports = {
	validSender,
	validPassphrase,
	validKeypair,
	senderHash,
	senderKeypair,
	rawValidTransaction,
	validTransaction,
	validGetGensisResult,
};
