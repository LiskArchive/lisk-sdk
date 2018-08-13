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

export function itShouldReturnThePublicKeys() {
	const { returnValue, publicKeys } = this.test.ctx;
	return expect(returnValue).to.eql(publicKeys);
}

export function itShouldReturnAnObjectWithTheAddress() {
	const { returnValue, address } = this.test.ctx;
	return expect(returnValue).to.eql({ address });
}

export function itShouldReturnTheNormalizedAmount() {
	const { returnValue, normalizedAmount } = this.test.ctx;
	return expect(returnValue).to.equal(normalizedAmount);
}

export function itShouldReturnTheAlias() {
	const { returnValue, alias } = this.test.ctx;
	return expect(returnValue).to.equal(alias);
}

export function itShouldReturnTheType() {
	const { returnValue, type } = this.test.ctx;
	return expect(returnValue).to.equal(type);
}
