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
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';

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
	const setupTest = () =>
		test
			.env({ LISK_COMMANDER_CONFIG_DIR: defaultDir })
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns(defaultConfig))
			.stub(config, 'setConfig', sandbox.stub().returns(true));

	describe('config:set', () => {
		setupTest()
			.stdout()
			.command(['config:set'])
			.catch((error: Error) =>
				expect(error.message).to.contain('Missing 1 required arg'),
			)
			.it('should throw an error when no value is set');
	});

	describe('config:set key', () => {
		const unknownValue = 'newvalue';
		setupTest()
			.stdout()
			.command(['config:set', 'newvalue'])
			.catch((error: Error) =>
				expect(error.message).to.contain(
					`Expected ${unknownValue} to be one of:`,
				),
			)
			.it('should throw an error when the value is not supported');

		setupTest()
			.stdout()
			.command(['config:set', 'api.nodes'])
			.it('should set api.nodes to empty array', () => {
				const newConfig = {
					...defaultConfig,
					api: {
						network: defaultConfig.api.network,
						nodes: [],
					},
				};
				return expect(config.setConfig).to.be.calledWith(defaultDir, newConfig);
			});
	});

	describe('config:set key value ', () => {
		describe('config:set api.nodes value', () => {
			setupTest()
				.stdout()
				.command(['config:set', 'api.nodes', 'http://somehost:1234'])
				.it('should set api.nodes to single value', () => {
					const newConfig = {
						...defaultConfig,
						api: {
							network: defaultConfig.api.network,
							nodes: ['http://somehost:1234'],
						},
					};
					return expect(config.setConfig).to.be.calledWith(
						defaultDir,
						newConfig,
					);
				});

			setupTest()
				.stdout()
				.command([
					'config:set',
					'api.nodes',
					'http://somehost:1234,http://localhost:4000',
				])
				.it('should set api.nodes to array with 2 values', () => {
					const newConfig = {
						...defaultConfig,
						api: {
							network: defaultConfig.api.network,
							nodes: ['http://somehost:1234', 'http://localhost:4000'],
						},
					};
					return expect(config.setConfig).to.be.calledWith(
						defaultDir,
						newConfig,
					);
				});

			setupTest()
				.stdout()
				.command(['config:set', 'api.nodes', 'ws://hostname'])
				.catch((error: Error) =>
					expect(error.message).to.contain(
						'Node URLs must include a supported protocol (http, https) and a hostname.',
					),
				)
				.it(
					'should throw error when api.nodes value is not supported protocol',
				);

			setupTest()
				.stdout()
				.command(['config:set', 'api.nodes', 'http://'])
				.catch((error: Error) =>
					expect(error.message).to.contain(
						'Node URLs must include a supported protocol (http, https) and a hostname.',
					),
				)
				.it('should throw error when api.nodes value does not have host name');

			setupTest()
				.stdout()
				.stub(config, 'getConfig', sandbox.stub().returns({}))
				.command(['config:set', 'api.nodes', 'http://hostname'])
				.catch((error: Error) =>
					expect(error.message).to.contain(
						'It looks like your configuration file is corrupted. Please check the file at',
					),
				)
				.it('should throw error when config file is corrupted');
		});

		describe('config:set json value', () => {
			setupTest()
				.stdout()
				.command(['config:set', 'json', 'true'])
				.it('should set json to provided boolean value', () => {
					const newConfig = {
						...defaultConfig,
						json: true,
					};
					return expect(config.setConfig).to.be.calledWith(
						defaultDir,
						newConfig,
					);
				});

			setupTest()
				.stub(config, 'setConfig', sandbox.stub().returns(false))
				.stdout()
				.command(['config:set', 'json', 'true'])
				.catch((error: Error) =>
					expect(error.message).to.contain(
						'Config file could not be written: your changes will not be persisted',
					),
				)
				.it('should throw an error when setConfig fails');

			setupTest()
				.stdout()
				.command(['config:set', 'json', 'truely'])
				.catch((error: Error) =>
					expect(error.message).to.contain('Value must be a boolean.'),
				)
				.it('should throw error when json value is not boolean');

			setupTest()
				.stdout()
				.command(['config:set', 'json'])
				.catch((error: Error) =>
					expect(error.message).to.contain('Value must be a boolean.'),
				)
				.it('should throw error when json value is not specified');
		});

		describe('config:set api.network value', () => {
			const validNethash =
				'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d';
			setupTest()
				.stdout()
				.command(['config:set', 'api.network', validNethash])
				.it('should set api.network to the custom nethash', () => {
					const newConfig = {
						...defaultConfig,
						api: {
							network: validNethash,
							nodes: defaultConfig.api.nodes,
						},
					};
					return expect(config.setConfig).to.be.calledWith(
						defaultDir,
						newConfig,
					);
				});

			setupTest()
				.stdout()
				.command(['config:set', 'api.network', 'test'])
				.it('should set api.network to a known network', () => {
					const newConfig = {
						...defaultConfig,
						api: {
							network: 'test',
							nodes: defaultConfig.api.nodes,
						},
					};
					return expect(config.setConfig).to.be.calledWith(
						defaultDir,
						newConfig,
					);
				});

			setupTest()
				.stdout()
				.command([
					'config:set',
					'api.network',
					'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f78',
				])
				.catch((error: Error) =>
					expect(error.message).to.contain(
						'Value must be a hex string with 64 characters, or one of main or test.',
					),
				)
				.it(
					'should throw error when api.network value is unknown and does not have length 64',
				);

			setupTest()
				.stdout()
				.command([
					'config:set',
					'api.network',
					'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9zzzzzzzz',
				])
				.catch((error: Error) =>
					expect(error.message).to.contain(
						'Value must be a hex string with 64 characters, or one of main or test.',
					),
				)
				.it(
					'should throw error when api.network value is unknown and not a valid hex string',
				);
		});
	});
});
