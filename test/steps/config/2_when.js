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
import fs from 'fs';

export function theConfigIsLoaded() {
	// IMPORTANT: This is a workaround because Node’s `require` implementation uses `fs.readFileSync`.
	// If this step gets reused in other tests we’ll have to find a better solution.
	const isSpy = fs.readFileSync.restore;
	// istanbul ignore else
	if (isSpy) fs.readFileSync.restore();

	const configPath = '../../../src/utils/config';
	// eslint-disable-next-line global-require, import/no-dynamic-require
	this.test.ctx.config = require(configPath).default;

	// istanbul ignore else
	if (isSpy) sandbox.stub(fs, 'readFileSync');
}
