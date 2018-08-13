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
export function itShouldDeleteTheJsonOption() {
	const { options } = this.test.ctx;
	expect(options).not.to.have.property('json');
}

export function itShouldDeleteTheTableOption() {
	const { options } = this.test.ctx;
	expect(options).not.to.have.property('table');
}

export function itShouldNotDeleteTheJsonOption() {
	const { options } = this.test.ctx;
	expect(options).to.have.property('json');
}

export function itShouldNotDeleteTheTableOption() {
	const { options } = this.test.ctx;
	expect(options).to.have.property('table');
}
