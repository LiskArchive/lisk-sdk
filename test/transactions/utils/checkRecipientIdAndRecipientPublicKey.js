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
import { checkRecipientIdAndRecipientPublicKey } from '../../../src/transactions/utils';

describe('#checkRecipientIdAndRecipientPublicKey', () => {
	const recipientId = '18160565574430594874L';
	const recipientPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const malformedRecipientPublicKey =
		'12345a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';

	describe('it should check if a given recipientId and recipientPublicKey match', () => {
		it('when they match, it should return the address and publicKey', () => {
			checkRecipientIdAndRecipientPublicKey({
				recipientId,
				recipientPublicKey,
			}).should.be.eql({ address: recipientId, publicKey: recipientPublicKey });
		});

		it('when they do not match, it should throw', () => {
			checkRecipientIdAndRecipientPublicKey
				.bind(null, {
					recipientId,
					recipientPublicKey: malformedRecipientPublicKey,
				})
				.should.throw(
					'RecipientId and recipientPublicKey do not match. Please check.',
				);
		});
	});

	describe('When a recipientPublicKey and no address is given', () => {
		it('it should return the address and the publicKey', () => {
			checkRecipientIdAndRecipientPublicKey({
				recipientPublicKey,
			}).should.be.eql({ address: recipientId, publicKey: recipientPublicKey });
		});
	});

	describe('When an address is given but no publicKey', () => {
		it('it should return the address and null for the publicKey', () => {
			checkRecipientIdAndRecipientPublicKey({ recipientId }).should.be.eql({
				address: recipientId,
				publicKey: null,
			});
		});
	});
});
