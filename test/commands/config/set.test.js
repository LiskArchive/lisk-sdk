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
		json: false,
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
		.it('should throw an error when no variable is set');

	const randomVariable = 'newvariable';
	setupStub
		.stdout()
		.command(['config:set', 'newvariable'])
		.catch(error =>
			expect(error.message).to.contain(
				`Expected ${randomVariable} to be one of:`,
			),
		)
		.it('should throw an error when the variable is not supported');

	describe('api.nodes', () => {
		setupStub
			.stdout()
			.command(['config:set', 'api.nodes', 'http://somehost:1234'])
			.it('should set api.nodes to single value', () => {
				const newConfig = Object.assign({}, defaultConfig, {
					api: {
						network: defaultConfig.api.network,
						nodes: ['http://somehost:1234'],
					},
				});
				return expect(config.setConfig).to.be.calledWith(defaultDir, newConfig);
			});

		setupStub
			.stdout()
			.command([
				'config:set',
				'api.nodes',
				'http://somehost:1234,http://localhost:4000',
			])
			.it('should set api.nodes to array with 2 values', () => {
				const newConfig = Object.assign({}, defaultConfig, {
					api: {
						network: defaultConfig.api.network,
						nodes: ['http://somehost:1234', 'http://localhost:4000'],
					},
				});
				return expect(config.setConfig).to.be.calledWith(defaultDir, newConfig);
			});

		setupStub
			.stdout()
			.command(['config:set', 'api.nodes'])
			.it('should set api.nodes to empty array', () => {
				const newConfig = Object.assign({}, defaultConfig, {
					api: {
						network: defaultConfig.api.network,
						nodes: [],
					},
				});
				return expect(config.setConfig).to.be.calledWith(defaultDir, newConfig);
			});

		setupStub
			.stdout()
			.command(['config:set', 'api.nodes', 'ws://hostname'])
			.catch(error =>
				expect(error.message).to.contain(
					'Node URLs must include a supported protocol',
				),
			)
			.it('should throw error when api.nodes value is not supported protocol');

		setupStub
			.stdout()
			.command(['config:set', 'api.nodes', 'http://'])
			.catch(error =>
				expect(error.message).to.contain(
					'Node URLs must include a supported protocol',
				),
			)
			.it('should throw error when api.nodes value does not have host name');

		setupStub
			.stdout()
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.command(['config:set', 'api.nodes', 'http://hostname'])
			.catch(error =>
				expect(error.message).to.contain(
					'It looks like your configuration file is corrupted. Please check the file at',
				),
			)
			.it('should throw error when config file is currupted');
	});

	describe('json', () => {
		setupStub
			.stdout()
			.command(['config:set', 'json', 'true'])
			.it('should json to provided value', () => {
				const newConfig = Object.assign({}, defaultConfig, {
					json: true,
				});
				return expect(config.setConfig).to.be.calledWith(defaultDir, newConfig);
			});

		setupStub
			.stub(config, 'setConfig', sandbox.stub().returns(false))
			.stdout()
			.command(['config:set', 'json', 'true'])
			.catch(error =>
				expect(error.message).to.contain(
					'Config file could not be written: your changes will not be persisted',
				),
			)
			.it('should throw an error when setConfig fails');

		setupStub
			.stdout()
			.command(['config:set', 'json', 'truely'])
			.catch(error =>
				expect(error.message).to.contain('Value must be a boolean.'),
			)
			.it('should throw error when json value is not boolean');
	});

	describe('name', () => {
		setupStub
			.stdout()
			.command(['config:set', 'name', 'new name'])
			.it('should set name to provided value', () => {
				const newConfig = Object.assign({}, defaultConfig, {
					name: 'new name',
				});
				return expect(config.setConfig).to.be.calledWith(defaultDir, newConfig);
			});
	});
	describe('api.network', () => {
		const validNethash =
			'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d';
		setupStub
			.stdout()
			.command(['config:set', 'api.network', validNethash])
			.it(
				'should throw error when api.network value is not valid hex string',
				() => {
					const newConfig = Object.assign({}, defaultConfig, {
						api: {
							network: validNethash,
							nodes: defaultConfig.api.nodes,
						},
					});
					return expect(config.setConfig).to.be.calledWith(
						defaultDir,
						newConfig,
					);
				},
			);

		setupStub
			.stdout()
			.command(['config:set', 'api.network', 'beta'])
			.it('should set api.network to beta', () => {
				const newConfig = Object.assign({}, defaultConfig, {
					api: {
						network: 'beta',
						nodes: defaultConfig.api.nodes,
					},
				});
				return expect(config.setConfig).to.be.calledWith(defaultDir, newConfig);
			});

		setupStub
			.stdout()
			.command([
				'config:set',
				'api.network',
				'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f78',
			])
			.catch(error =>
				expect(error.message).to.contain(
					'Value must be a hex string with 64 characters, or one of main, test or beta.',
				),
			)
			.it('should throw error when api.network value is not length of 64');

		setupStub
			.stdout()
			.command([
				'config:set',
				'api.network',
				'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9zzzzzzzz',
			])
			.catch(error =>
				expect(error.message).to.contain(
					'Value must be a hex string with 64 characters, or one of main, test or beta.',
				),
			)
			.it('should throw error when api.network value is not valid hex string');
	});
});
