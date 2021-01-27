/*
 * LiskHQ/lisk-commander
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
 *
 */
import { expect, test } from '@oclif/test';

describe('generate:module command', () => {
	const setupTest = () => test;

	describe('generate:module', () => {
		setupTest()
			.command(['generate:module'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 2 required arg');
			})
			.it('should throw an error');

		setupTest()
			.command(['generate:module', 'nft'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('generate:module invalidModuleName invalidModuleID', () => {
		setupTest()
			.command(['generate:module', 'nft$5', '1001'])
			.catch(error => {
				return expect(error.message).to.contain('Invalid module name');
			})
			.it('should throw an error');

		setupTest()
			.command(['generate:module', 'nft', '5r'])
			.catch(error => {
				return expect(error.message).to.contain('Invalid module ID');
			})
			.it('should throw an error');
	});
});
