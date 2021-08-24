/*
 * Copyright © 2021 Lisk Foundation
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
 */

import { DashboardPlugin } from '../../../src/plugin';

describe('DashboardPlugin', () => {
	describe('defaults', () => {
		it('should return valid config schema with default options', () => {
			// eslint-disable-nextline
			const plugin = new DashboardPlugin();

			expect(plugin.configSchema).toMatchSnapshot();
		});
	});

	describe('constructor', () => {
		it('should load default config', () => {
			// eslint-disable-nextline
			const plugin = new DashboardPlugin();

			expect(plugin.config).toMatchSnapshot();
		});
	});
});
