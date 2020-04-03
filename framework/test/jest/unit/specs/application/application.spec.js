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
/* eslint-disable max-classes-per-file */

'use strict';

const {
	BaseTransaction: Base,
	TransferTransaction,
} = require('@liskhq/lisk-transactions');

const _ = require('lodash');
const { validator: liskValidator } = require('@liskhq/lisk-validator');
const Application = require('../../../../../src/application/application');
const validator = require('../../../../../src/application/validator');
const {
	SchemaValidationError,
	genesisBlockSchema,
	constantsSchema,
} = require('../../../../../src/application/schema');
const loggerComponent = require('../../../../../src/components/logger');
const storageComponent = require('../../../../../src/components/storage');
const networkConfig = require('../../../../fixtures/config/devnet/config');
const genesisBlock = require('../../../../fixtures/config/devnet/genesis_block');

const config = {
	...networkConfig,
};

jest.mock('../../../../../src/components/logger');
jest.mock('../../../../../src/components/storage');
jest.mock('@liskhq/lisk-validator', () => ({
	validator: {
		validate: jest.fn().mockImplementation(() => {
			return [];
		}),
	},
}));

// eslint-disable-next-line
describe('Application', () => {
	// Arrange
	const frameworkTxTypes = ['8', '10', '12', '13', '14'];
	const loggerMock = {
		info: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		trace: jest.fn(),
	};
	const storageMock = {
		entities: {
			Migration: {
				defineSchema: jest.fn(),
				applyAll: jest.fn(),
			},
			Account: {
				extendDefaultOptions: jest.fn(),
			},
			NetworkInfo: {
				getKey: jest.fn(),
				setKey: jest.fn(),
			},
		},
		registerEntity: jest.fn(),
		bootstrap: jest.fn(),
	};
	loggerComponent.createLoggerComponent.mockReturnValue(loggerMock);
	storageComponent.createStorageComponent.mockReturnValue(storageMock);

	afterEach(() => {
		// So we can start a fresh schema each time Application is instantiated
		validator.validator.removeSchema();
		validator.parserAndValidator.removeSchema();
	});

	describe('#constructor', () => {
		it('should validate genesisBlock', () => {
			// Act

			// eslint-disable-next-line no-new
			new Application(genesisBlock, config);
			// Assert
			expect(liskValidator.validate).toHaveBeenNthCalledWith(
				1,
				genesisBlockSchema,
				genesisBlock,
			);
		});

		it('should set app label with the genesis block payload hash prefixed with `lisk-` if label not provided', () => {
			const label = `lisk-${genesisBlock.payloadHash.slice(0, 7)}`;
			const configWithoutLabel = _.cloneDeep(config);
			delete configWithoutLabel.label;

			const app = new Application(genesisBlock, configWithoutLabel);

			expect(app.config.label).toBe(label);
		});

		it('should use the same app label if provided', () => {
			const app = new Application(genesisBlock, config);

			expect(app.config.label).toBe(config.label);
		});

		it('should set default tempPath if not provided', () => {
			// Arrange
			const tempPath = '/tmp/lisk';
			const configWithoutTempPath = _.cloneDeep(config);
			delete configWithoutTempPath.tempPath;

			// Act
			const app = new Application(genesisBlock, configWithoutTempPath);

			// Assert
			expect(app.config.tempPath).toBe(tempPath);
		});

		it('should set tempPath if provided', () => {
			// Arragne
			const customTempPath = '/my-lisk-folder';
			const configWithCustomTempPath = _.cloneDeep(config);
			configWithCustomTempPath.tempPath = customTempPath;

			// Act
			const app = new Application(genesisBlock, configWithCustomTempPath);

			// Assert
			expect(app.config.tempPath).toBe(customTempPath);
		});

		it('should set filename for logger if logger component was not provided', () => {
			// Arrange
			const configWithoutLogger = _.cloneDeep(config);
			configWithoutLogger.components.logger = {};

			// Act
			const app = new Application(genesisBlock, configWithoutLogger);

			// Assert
			expect(app.config.components.logger.logFileName).toBe(
				`${process.cwd()}/logs/${config.label}/lisk.log`,
			);
		});

		it('should validate the constants', () => {
			const parseEnvArgAndValidateSpy = jest.spyOn(
				validator,
				'parseEnvArgAndValidate',
			);

			// eslint-disable-next-line no-new
			new Application(genesisBlock, config);

			expect(parseEnvArgAndValidateSpy).toHaveBeenCalledTimes(1);
			expect(parseEnvArgAndValidateSpy).toHaveBeenCalledWith(
				constantsSchema,
				expect.any(Object),
			);
		});

		it('should merge the constants with genesisConfig and assign it to app constants', () => {
			const customConfig = _.cloneDeep(config);

			customConfig.genesisConfig = {
				maxPayloadLength: 15 * 1024,
				epochTime: '2016-05-24T17:00:00.000Z',
				blockTime: 2,
				rewards: {
					milestones: [
						'500000000',
						'400000000',
						'300000000',
						'200000000',
						'100000000',
					],
					offset: 2160,
					distance: 3000000,
				},
			};

			const app = new Application(genesisBlock, customConfig);

			expect(app.constants.maxPayloadLength).toBe(15 * 1024);
		});

		it('should set internal variables', () => {
			// Act
			const app = new Application(genesisBlock, config);

			// Assert
			expect(app.genesisBlock).toBe(genesisBlock);
			expect(app.config).toMatchSnapshot();
			expect(app._controller).toBeNull();
			expect(app._node).toBeNull();
			expect(app._network).toBeNull();
			expect(app.channel).toBeNull();
			expect(app.initialState).toBeNull();
			expect(app.applicationState).toBeNull();
			expect(app._migrations).toBeInstanceOf(Object);
			expect(app._modules).toBeInstanceOf(Object);
			expect(app._transactions).toBeInstanceOf(Object);
		});

		it('should register http_api module', () => {
			// Act
			const app = new Application(genesisBlock, config);

			// Assert
			expect(Object.keys(app._modules)).toEqual(['http_api']);
		});

		it('should initialize logger', () => {
			// Act
			const app = new Application(genesisBlock, config);

			// Assert
			expect(app.logger).toBe(loggerMock);
		});

		it('should initialize storage', () => {
			// Act
			const app = new Application(genesisBlock, config);

			// Assert
			expect(app.storage).toBe(storageMock);
		});

		it('should contain all framework related transactions.', () => {
			// Act
			const app = new Application(genesisBlock, config);

			// Assert
			expect(Object.keys(app.getTransactions())).toEqual(frameworkTxTypes);
		});

		// Skipped because `new Application` is mutating params.config making the other tests to fail
		// eslint-disable-next-line jest/no-disabled-tests
		it('should throw validation error if constants are overriden by the user', () => {
			const customConfig = _.cloneDeep(config);

			customConfig.genesisConfig = {
				CONSTANT: 'aConstant',
			};

			expect(() => {
				// eslint-disable-next-line no-new
				new Application(genesisBlock, customConfig);
			}).toThrow('should NOT have additional properties');
		});
	});

	describe('#registerTransaction', () => {
		it('should throw error when transaction class is missing.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			// Act && Assert
			expect(() => app.registerTransaction()).toThrow(
				'Transaction implementation is required',
			);
		});

		it('should throw error when transaction does not satisfy TransactionInterface.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			const TransactionWithoutBase = {
				prototype: {},
				...TransferTransaction,
			};

			// Act && Assert
			expect(() => app.registerTransaction(TransactionWithoutBase)).toThrow(
				SchemaValidationError,
			);
		});

		it('should throw error when transaction type is missing.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);
			class Sample extends Base {}

			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow(
				'Transaction type is required as an integer',
			);
		});

		it('should throw error when transaction type is not integer.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			class Sample extends Base {}
			Sample.TYPE = 'abc';

			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow(
				'Transaction type is required as an integer',
			);
		});

		it('should throw error when transaction interface does not match.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			class Sample extends Base {}
			Sample.TYPE = 10;
			Sample.prototype.apply = 'not a function';

			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow();
		});

		it('should register transaction when passing a new transaction type and a transaction implementation.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			// Act
			class Sample extends Base {}
			Sample.TYPE = 15;
			app.registerTransaction(Sample);

			// Assert
			expect(app.getTransaction(15)).toBe(Sample);
		});
	});

	describe('#_initChannel', () => {
		let app;
		let actions;

		beforeEach(() => {
			// Arrange
			app = new Application(genesisBlock, config);
			app.channel = app._initChannel();
			actions = app.channel.actionsList.map(action => action.name);
		});

		it('should create getAccount action', () => {
			// Assert
			expect(actions).toContain('getAccount');
		});

		it('should create getAccounts action', () => {
			// Assert
			expect(actions).toContain('getAccounts');
		});

		it('should create getBlockByID action', () => {
			// Assert
			expect(actions).toContain('getBlockByID');
		});

		it('should create getBlocksByIDs action', () => {
			// Assert
			expect(actions).toContain('getBlocksByIDs');
		});

		it('should create getBlockByHeight action', () => {
			// Assert
			expect(actions).toContain('getBlockByHeight');
		});

		it('should create getBlocksByHeightBetween action', () => {
			// Assert
			expect(actions).toContain('getBlocksByHeightBetween');
		});

		it('should create getTransactionByID action', () => {
			// Assert
			expect(actions).toContain('getTransactionByID');
		});

		it('should create getTransactionsByIDs action', () => {
			// Assert
			expect(actions).toContain('getTransactionsByIDs');
		});
	});
});
