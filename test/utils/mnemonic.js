/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import * as mnemonic from '../../src/utils/mnemonic';

describe('mnemonic utils', () => {
	it('createMnemonicPassphrase should be a function', () => {
		return expect(mnemonic.createMnemonicPassphrase).to.be.a('function');
	});

	it('isValidMnemonicPassphrase should be a function', () => {
		return expect(mnemonic.isValidMnemonicPassphrase).to.be.a('function');
	});
});
