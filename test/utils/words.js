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
import words from '../../src/utils/words';

describe('words module', () => {
	it('should export a list of 2048 words', () => {
		(words).should.have.length(2048);
	});

	it('should export a list of strings', () => {
		words.forEach(word => (word).should.be.type('string'));
	});
});
