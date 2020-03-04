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
import * as cryptography from '@liskhq/lisk-cryptography';
import { serializeSignatures } from '../../src/utils';
import * as multisigFixture from '../../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';

describe('serializeSignatures', () => {
	const { signatures } = multisigFixture.testCases.output;

	describe('serializeSignatures', () => {
		let cryptoHashSpy: jest.SpyInstance;

		beforeEach(() => {
			cryptoHashSpy = jest.spyOn(cryptography, 'hexToBuffer');
		});

		it('should return empty buffer when signatures is empty array', () => {
			expect(serializeSignatures([])).toEqual(Buffer.alloc(0));
			expect(cryptoHashSpy).toHaveBeenCalledTimes(0);
		});

		it('should append 0x01 to non empty signatures', () => {
			const expectedOutput = signatures.map(signature => {
				return Buffer.concat([
					Buffer.from('0x01'),
					cryptography.hexToBuffer(signature),
				]);
			});

			expect(serializeSignatures(signatures)).toEqual(
				Buffer.concat(expectedOutput),
			);
			expect(cryptoHashSpy).toHaveBeenCalledTimes(10);
		});

		it('should append 0x00 to empty signatures', () => {
			const mixedSignatures = [signatures[0], '', signatures[1]];
			const expectedOutput = mixedSignatures.map(signature => {
				if (signature.length === 0) {
					return Buffer.from('0x00');
				}

				return Buffer.concat([
					Buffer.from('0x01'),
					cryptography.hexToBuffer(signature),
				]);
			});

			expect(serializeSignatures(mixedSignatures)).toEqual(
				Buffer.concat(expectedOutput),
			);
			expect(cryptoHashSpy).toHaveBeenCalledTimes(4);
		});
	});
});
