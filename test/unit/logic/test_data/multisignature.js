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
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	passphrase:
		'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
	balance: '10000000000000000',
};

var senderHash = crypto
	.createHash('sha256')
	.update(validSender.passphrase, 'utf8')
	.digest();
var senderKeypair = ed.makeKeypair(senderHash);

var multiSigAccount1 = {
	balance: '0',
	passphrase: 'jcja4vxibnw5dayk3xr',
	secondPassphrase: '0j64m005jyjj37bpdgqfr',
	username: 'LP',
	publicKey: 'bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2',
	address: '5936324907841470379L',
};

var multiSigAccount2 = {
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	passphrase:
		'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	balance: '0',
	delegateName: 'genesis_100',
};

var validTransaction = {
	id: '10004093306508192097',
	height: 2967,
	blockId: '16880210663552206127',
	type: 4,
	timestamp: 39547828,
	senderPublicKey:
		'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 0,
	fee: 1500000000,
	signature:
		'c66a726defca0fcdb5978292e4c999d37ba08dfa9ea0796de04e57f48f77489f3868754fc208c42ac957e259494040e61b16ee7a8d715eb198bedf963dc18907',
	signatures: [
		'02eee0660459c36916c3c230e48cd7bec84b9ebe30049202a85d950bd36988ed46f313bc43b8240bd3886d4eb0571253d6615aae14df0a97cf8d5420f491aa0a',
		'a77e0f0a6e3db16542cf26268070a1a5bb69f6b90e855943c9cf8f3cde22c6c10e43e8443b33722973ebe7de6f6abcfb1792cd50c5082c66805c5ad9c486c108',
	],
	confirmations: 3,
	asset: {
		multisignature: {
			min: 2,
			lifetime: 2,
			keysgroup: [
				'+bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2',
				'+addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
			],
		},
	},
};

var rawValidTransaction = {
	t_id: '10004093306508192097',
	b_height: 2967,
	t_blockId: '16880210663552206127',
	t_type: 4,
	t_timestamp: 39547828,
	t_senderPublicKey:
		'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	m_recipientPublicKey: null,
	t_senderId: '16313739661670634666L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '1500000000',
	t_signature:
		'c66a726defca0fcdb5978292e4c999d37ba08dfa9ea0796de04e57f48f77489f3868754fc208c42ac957e259494040e61b16ee7a8d715eb198bedf963dc18907',
	t_SignSignature: null,
	t_signatures:
		'02eee0660459c36916c3c230e48cd7bec84b9ebe30049202a85d950bd36988ed46f313bc43b8240bd3886d4eb0571253d6615aae14df0a97cf8d5420f491aa0a,a77e0f0a6e3db16542cf26268070a1a5bb69f6b90e855943c9cf8f3cde22c6c10e43e8443b33722973ebe7de6f6abcfb1792cd50c5082c66805c5ad9c486c108',
	confirmations: 11,
	m_min: 2,
	m_lifetime: 2,
	m_keysgroup:
		'+bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2,+addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
};

module.exports = {
	validSender,
	validPassphrase,
	validKeypair,
	senderHash,
	senderKeypair,
	rawValidTransaction,
	validTransaction,
	multiSigAccount1,
	multiSigAccount2,
};
