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
import * as sandbox from 'sinon';
import fs from 'fs-extra';
import { expect, test } from '@oclif/test';

describe('generate:network-config command', () => {
	const setupTest = () => test.stub(fs, 'writeJSONSync', sandbox.stub().returns({})).stdout();
	describe('generate:network-config', () => {
		setupTest()
			.command(['generate:network-config'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('generate:network-config myDir', () => {
		setupTest()
			.command(['generate:network-config', 'myDir'])
			.catch(error => {
				return expect(error.message).to.contain('Invalid name');
			})
			.it('should throw an error');
	});

	describe('generate:network-config "my dir"', () => {
		setupTest()
			.command(['generate:network-config', 'my dir'])
			.catch(error => {
				return expect(error.message).to.contain('Invalid name');
			})
			.it('should throw an error');
	});

	describe('generate:network-config mydir', () => {
		setupTest()
			.command(['generate:network-config', 'mydir'])
			.it('should write to file', () => {
				expect(fs.writeJSONSync).to.be.calledOnce;
			});
	});
});
