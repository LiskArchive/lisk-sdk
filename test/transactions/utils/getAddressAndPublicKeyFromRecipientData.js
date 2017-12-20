/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import { getAddressAndPublicKeyFromRecipientData } from '../../../src/transactions/utils';

describe('#getAddressAndPublicKeyFromRecipientData', () => {
	const recipientId = '18160565574430594874L';
	const recipientPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const recipientPublicKeyThatDoesNotMatchRecipientId =
		'12345a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';

	describe('When both recipientPublicKey and an address are given', () => {
		it('when they match, it should return the address and publicKey', () => {
			return getAddressAndPublicKeyFromRecipientData({
				recipientId,
				recipientPublicKey,
			}).should.be.eql({ address: recipientId, publicKey: recipientPublicKey });
		});

		it('when they do not match, it should throw', () => {
			return getAddressAndPublicKeyFromRecipientData
				.bind(null, {
					recipientId,
					recipientPublicKey: recipientPublicKeyThatDoesNotMatchRecipientId,
				})
				.should.throw(
					'Could not create transaction: recipientId does not match recipientPublicKey.',
				);
		});
	});

	describe('When a recipientPublicKey and no address is given', () => {
		it('it should return the address and the publicKey', () => {
			return getAddressAndPublicKeyFromRecipientData({
				recipientPublicKey,
			}).should.be.eql({ address: recipientId, publicKey: recipientPublicKey });
		});
	});

	describe('When an address is given but no publicKey', () => {
		it('it should return the address and null for the publicKey', () => {
			return getAddressAndPublicKeyFromRecipientData({
				recipientId,
			}).should.be.eql({
				address: recipientId,
				publicKey: null,
			});
		});
	});
});
