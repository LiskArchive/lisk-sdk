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
import { getSignaturesBytes } from '../../src/utils';
import * as transferFixture from '../../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';

describe('getSignaturesBytes', () => {
	const [signature] = transferFixture.testCases[0].output.signatures;

	describe('getSignaturesBytes', () => {
		let cryptoHashSpy: jest.SpyInstance;

		beforeEach(() => {
			cryptoHashSpy = jest.spyOn(cryptography, 'hexToBuffer');
		});

		it('should return empty buffer when signatures is empty array', () => {
			expect(getSignaturesBytes([])).toEqual(Buffer.alloc(0));
			expect(cryptoHashSpy).toHaveBeenCalledTimes(0);
		});

		it('should return correct buffer when signatures has one signature', () => {
			const expectedOutput = cryptography.hexToBuffer(signature);

			expect(getSignaturesBytes([signature])).toEqual(expectedOutput);
			expect(cryptoHashSpy).toHaveBeenCalledTimes(2);
		});

		it('should return correct buffer when signatures has more than one signature', () => {
			const expectedOutput = cryptography.hexToBuffer(signature);

			expect(getSignaturesBytes([signature, signature])).toEqual(
				Buffer.concat([expectedOutput, expectedOutput]),
			);
			expect(cryptoHashSpy).toHaveBeenCalledTimes(3);
		});
	});
});
