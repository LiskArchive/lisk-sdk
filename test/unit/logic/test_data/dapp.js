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
	passphrase: 'yjyhgnu32jmwuii442t9',
	secondPassphrase: 'kub8gm2w330pvptx1or',
	username: 'mix8',
	publicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	address: '4835566122337813671L',
	secondPublicKey:
		'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7',
};

var senderHash = crypto
	.createHash('sha256')
	.update(validSender.passphrase, 'utf8')
	.digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validTransaction = {
	id: '1907088915785679339',
	height: 371,
	blockId: '17233974955873751907',
	type: 5,
	timestamp: 40081792,
	senderPublicKey:
		'644485a01cb11e06a1f4ffef90a7ba251e56d54eb06a0cb2ecb5693a8cc163a2',
	senderId: '5519106118231224961L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 0,
	fee: 2500000000,
	signature:
		'b024f90f73e53c9fee943f3c3ef7a9e3da99bab2f9fa3cbfd5ad05ed79cdbbe21130eb7b27698692bf491a1cf573a518dfa63607dc88bc0c01925fda18304905',
	signatures: [],
	confirmations: 717,
	asset: {
		dapp: {
			name: 'AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi',
			description: null,
			tags: null,
			type: 1,
			link: 'http://www.lisk.io/AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi.zip',
			category: 2,
			icon: null,
		},
	},
};

var rawValidTransaction = {
	t_id: '1907088915785679339',
	b_height: 371,
	t_blockId: '17233974955873751907',
	t_type: 5,
	t_timestamp: 40081792,
	t_senderPublicKey:
		'644485a01cb11e06a1f4ffef90a7ba251e56d54eb06a0cb2ecb5693a8cc163a2',
	m_recipientPublicKey: null,
	t_senderId: '5519106118231224961L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '2500000000',
	t_signature:
		'b024f90f73e53c9fee943f3c3ef7a9e3da99bab2f9fa3cbfd5ad05ed79cdbbe21130eb7b27698692bf491a1cf573a518dfa63607dc88bc0c01925fda18304905',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 717,
	dapp_name: 'AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi',
	dapp_description: null,
	dapp_tags: null,
	dapp_link: 'http://www.lisk.io/AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi.zip',
	dapp_type: 1,
	dapp_category: 2,
	dapp_icon: null,
};

module.exports = {
	validSender,
	validPassphrase,
	validKeypair,
	senderHash,
	senderKeypair,
	rawValidTransaction,
	validTransaction,
};
