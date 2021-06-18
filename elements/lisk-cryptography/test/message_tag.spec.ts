/*
 * Copyright © 2020 Lisk Foundation
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

import { createMessageTag, tagMessage } from '../src/message_tag';

describe('Message Tag', () => {
	describe('createMessageTag', () => {
		it('should throw error if domain contains a space', () => {
			expect(() => createMessageTag('MY TX')).toThrow(
				'Message tag domain must be alpha numeric without special characters. Got "MY TX".',
			);
		});

		it('should throw error if domain contains a underscore', () => {
			expect(() => createMessageTag('MY_')).toThrow(
				'Message tag domain must be alpha numeric without special characters. Got "MY_".',
			);
		});

		it('should throw error if domain contains a special character', () => {
			expect(() => createMessageTag('MY*')).toThrow(
				'Message tag domain must be alpha numeric without special characters. Got "MY*".',
			);
		});

		it('should return a valid tag', () => {
			expect(createMessageTag('TX')).toEqual('LSK_TX_');
		});

		it('should return a valid tag with version of number type', () => {
			expect(createMessageTag('TX', 1)).toEqual('LSK_TX:1_');
		});

		it('should return a valid tag with version of string type', () => {
			expect(createMessageTag('TX', 'v2')).toEqual('LSK_TX:v2_');
		});
	});

	describe('tagMessage', () => {
		it('should concatenate the tag, network identifier and message when message is buffer', () => {
			const tag = createMessageTag('TX');
			const tagBuffer = Buffer.from(tag, 'utf8');
			const networkId = Buffer.from('abc', 'utf8');
			const message = Buffer.from('message', 'utf8');
			const result = Buffer.concat([tagBuffer, networkId, message]);

			expect(tagMessage(tag, networkId, message)).toEqual(result);
		});

		it('should concatenate the tag, network identifier and message when message is string', () => {
			const tag = createMessageTag('TX');
			const tagBuffer = Buffer.from(tag, 'utf8');
			const networkId = Buffer.from('abc', 'utf8');
			const message = Buffer.from('message', 'utf8');
			const result = Buffer.concat([tagBuffer, networkId, message]);

			expect(tagMessage(tag, networkId, 'message')).toEqual(result);
		});
	});
});
