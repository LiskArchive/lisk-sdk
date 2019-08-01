/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { expect, test } from '@oclif/test';
import * as config from '../../src/utils/config';

describe('copyright command', () => {
	const setupStub = () =>
		test.stub(config, 'getConfig', sandbox.stub().returns({}));

	describe('copyright', () => {
		setupStub()
			.stdout()
			.command(['copyright'])
			.it('should show copyright', ctx => {
				return expect(ctx.stdout).to.contain(
					'Lisk Commander  Copyright (C) 2017–2018  Lisk Foundation',
				);
			});
	});
});
