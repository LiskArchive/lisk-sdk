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
import { expect, test } from '../../test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';

describe('config:set', () => {
	const defaultConfig = {
		api: {
			network: 'main',
			nodes: ['http://localhost:4000'],
		},
	};

	const printMethodStub = sandbox.stub();
	const defaultDir = './someDir';
	const setupStub = test
		.env({ LISK_COMMANDER_CONFIG_DIR: defaultDir })
		.stub(print, 'default', sandbox.stub().returns(printMethodStub))
		.stub(config, 'getConfig', sandbox.stub().returns(defaultConfig))
		.stub(config, 'setConfig', sandbox.stub().returns(true));

	setupStub
		.stdout()
		.command(['config:set'])
		.catch(error => expect(error.message).to.contain('Missing 1 required arg'))
		.it('should throw an error');

	setupStub
		.stdout()
		.command(['config:set', 'api.nodes', 'http://somehost:1234'])
		.it('should call print with json', () => {
			const newConfig = Object.assign({}, defaultConfig, {
				api: {
					network: defaultConfig.api.network,
					nodes: ['http://somehost:1234'],
				},
			});
			return expect(config.setConfig).to.be.calledWith(defaultDir, newConfig);
		});
});
