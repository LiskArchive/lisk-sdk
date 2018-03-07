/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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
export function theMnemonicPassphraseShouldBeA12WordString() {
	const { mnemonicPassphrase } = this.test.ctx;
	const mnemonicWords = mnemonicPassphrase.split(' ').filter(Boolean);
	return expect(mnemonicWords).to.have.length(12);
}
