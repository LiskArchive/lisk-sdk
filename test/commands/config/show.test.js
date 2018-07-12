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
import { expect, test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';

describe('config:show', () => {
	const defaultConfig = {
		api: {
			network: 'main',
			nodes: ['http://localhost:4000'],
		},
	};

	const printMethodStub = sandbox.stub();
	const setupStub = () =>
		test
			.stub(print, 'default', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns(defaultConfig));

	describe('config:show', () => {
		setupStub()
			.stdout()
			.command(['config:show'])
			.it('should call print with the user config', () => {
				expect(print.default).to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(defaultConfig);
			});

		setupStub()
			.stdout()
			.command(['config:show', '--json', '--pretty'])
			.it('should call print with json', () => {
				expect(print.default).to.be.calledWith({ json: true, pretty: true });
				return expect(printMethodStub).to.be.calledWithExactly(defaultConfig);
			});
	});
});
