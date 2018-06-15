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
import { expect, test } from '../test';

describe('warranty command', () => {
	test
		.stdout()
		.command(['warranty'])
		.it('should show warranty', ctx => {
			expect(ctx.stdout).to.contain('THERE IS NO WARRANTY FOR THE PROGRAM');
		});
});
