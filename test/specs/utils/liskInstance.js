/*
 * LiskHQ/lisky
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
import lisk from 'lisk-js';
import liskInstance from '../../../src/utils/liskInstance';

const thenTheLiskInstanceShouldBeALiskJSApiInstance = () => {
	(liskInstance).should.be.instanceOf(lisk.api);
};

describe('liskInstance util', () => {
	describe('When the default export is imported', () => {
		it('Then the lisk instance should be a lisk-js api instance', thenTheLiskInstanceShouldBeALiskJSApiInstance);
	});
});
