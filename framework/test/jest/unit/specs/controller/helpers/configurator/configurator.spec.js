/*
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
 */

'use strict';

const {
	applicationConfigSchema,
} = require('../../../../../../../src/controller/schema');
const Configurator = require('../../../../../../../src/controller/configurator/configurator');

describe('Configurator', () => {
	describe('constructor()', () => {
		it('should assign parameters correctly', () => {
			const conf = new Configurator();

			expect(conf.configSchema).toEqual(applicationConfigSchema);
			expect(conf.metaInfo).toEqual({});
			expect(conf.listOfArgs).toEqual(new Set());
			expect(conf.customData).toEqual([]);
		});
	});

	describe('registerModule()', () => {
		it('should call registerModule with defaults option of the module and alias', () => {
			const module = {
				alias: 'module',
				defaults: {},
			};

			const conf = new Configurator();

			jest.spyOn(conf, 'registerSchema');
			conf.registerModule(module);

			expect(conf.registerSchema).toHaveBeenCalledTimes(1);
			expect(conf.registerSchema).toHaveBeenCalledWith(
				module.defaults,
				`modules.${module.alias}`,
			);
		});
	});

	describe('registerSchema()', () => {
		it('should merge with schema with configSchema if not key is given', () => {
			const schema = {
				properties: { myProp: { type: 'string' } },
				default: { myProp: 'myValue' },
			};
			const conf = new Configurator();
			jest.spyOn(conf, 'extractMetaInformation');
			conf.registerSchema(schema);

			expect(conf.configSchema.properties.myProp).toEqual(
				schema.properties.myProp,
			);
			expect(conf.configSchema.default.myProp).toEqual(schema.default.myProp);
			expect(conf.extractMetaInformation).toHaveBeenCalledTimes(1);
			expect(conf.extractMetaInformation).toHaveBeenCalledWith();
		});

		it('should merge with schema at specified key with configSchema', () => {
			const schema = {
				properties: { myProp: { type: 'string' } },
				default: { myProp: 'myValue' },
			};
			const conf = new Configurator();
			jest.spyOn(conf, 'extractMetaInformation');
			conf.registerSchema(schema, 'parent.parentProp');

			expect(
				conf.configSchema.properties.parent.properties.parentProp.properties
					.myProp,
			).toEqual(schema.properties.myProp);
			expect(conf.configSchema.default.parent.parentProp.myProp).toEqual(
				schema.default.myProp,
			);
			expect(conf.extractMetaInformation).toHaveBeenCalledTimes(1);
			expect(conf.extractMetaInformation).toHaveBeenCalledWith();
		});
	});

	describe('extractMetaInformation()', () => {
		it('should extract the arguments from schema if specified as string', () => {
			const schema = {
				type: 'object',
				properties: {
					myProp: {
						type: 'string',
						description: 'my description',
						arg: '--my-prop,-m',
					},
				},
			};
			const conf = new Configurator();
			conf.registerSchema(schema);

			expect(conf.metaInfo).toEqual({
				myProp: {
					arg: '--my-prop,-m',
					description: 'my description',
				},
			});
		});

		it('should extract the arguments from schema if specified as object', () => {
			const schema = {
				type: 'object',
				properties: {
					myProp: {
						type: 'string',
						description: 'my description',
						arg: {
							name: '--my-prop,-m',
						},
					},
				},
			};
			const conf = new Configurator();
			conf.registerSchema(schema);

			expect(conf.metaInfo).toEqual({
				myProp: {
					arg: '--my-prop,-m',
					description: 'my description',
				},
			});
		});

		it('should extract the env variable from schema if specified as string', () => {
			const schema = {
				type: 'object',
				properties: {
					myProp: {
						type: 'string',
						description: 'my description',
						env: 'MY_ENV',
					},
				},
			};
			const conf = new Configurator();
			conf.registerSchema(schema);

			expect(conf.metaInfo).toEqual({
				myProp: {
					env: 'MY_ENV',
					description: 'my description',
				},
			});
		});

		it('should extract the env variable from schema if specified as object', () => {
			const schema = {
				type: 'object',
				properties: {
					myProp: {
						type: 'string',
						description: 'my description',
						env: {
							variable: 'MY_ENV',
						},
					},
				},
			};
			const conf = new Configurator();
			conf.registerSchema(schema);

			expect(conf.metaInfo).toEqual({
				myProp: {
					env: 'MY_ENV',
					description: 'my description',
				},
			});
		});
	});

	describe('loadConfig()', () => {
		it('should push the config to customData', () => {
			const data1 = { myProp: 1 };
			const data2 = { myProp: 2 };
			const conf = new Configurator();
			conf.loadConfig(data1);
			conf.loadConfig(data2);

			expect(conf.customData).toEqual([data1, data2]);
		});
	});

	describe('getConfig()', () => {
		it('should merge and override the customData in last come as priority', () => {
			const data1 = {
				app: {
					label: 'myApp1',
					version: '1.0.0',
					protocolVersion: '1.0',
					minVersion: '0.9.0',
				},
			};
			const data2 = { app: { label: 'myApp2' } };
			const conf = new Configurator();
			conf.loadConfig(data1);
			conf.loadConfig(data2);

			const result = conf.getConfig({}, { failOnInvalidArg: false });
			expect(result.app.label).toEqual('myApp2');
		});

		it('should merge and override the provided override values', () => {
			const data1 = {
				app: {
					label: 'myApp1',
					version: '1.0.0',
					protocolVersion: '1.0',
					minVersion: '0.9.0',
				},
			};
			const data2 = { app: { label: 'myApp2' } };
			const data3 = { app: { label: 'myApp3' } };
			const conf = new Configurator();
			conf.loadConfig(data1);
			conf.loadConfig(data2);

			const result = conf.getConfig(data3, { failOnInvalidArg: false });
			expect(result.app.label).toEqual('myApp3');
		});
	});
});
