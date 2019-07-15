/*
 * Copyright © 2018 Lisk Foundation
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
	BaseTransaction: Base,
	DappTransaction,
} = require('@liskhq/lisk-transactions');

const _ = require('lodash');
const Application = require('../../../../../src/controller/application');
const validator = require('../../../../../src/controller/validator');
const {
	SchemaValidationError,
	genesisBlockSchema,
	constantsSchema,
} = require('../../../../../src/controller/schema');

jest.mock('../../../../../src/components/logger');

const networkConfig = require('../../../../fixtures/config/devnet/config');
const genesisBlock = require('../../../../fixtures/config/devnet/genesis_block');

const config = {
	...networkConfig,
};
// eslint-disable-next-line
describe('Application', () => {
	// Arrange
	const frameworkTxTypes = ['0', '1', '2', '3', '4'];

	afterEach(() => {
		// So we can start a fresh schema each time Application is instantiated
		validator.validator.removeSchema();
		validator.parserAndValidator.removeSchema();
	});

	describe('#constructor', () => {
		it('should validate genesisBlock', () => {
			// Act
			const validateSpy = jest.spyOn(validator, 'validate');
			new Application(genesisBlock, config);
			// Assert
			expect(validateSpy).toHaveBeenNthCalledWith(
				1,
				genesisBlockSchema,
				genesisBlock
			);
		});

		it('should set app label with the genesis block payload hash prefixed with `lisk-` if label not provided', () => {
			const label = `lisk-${genesisBlock.payloadHash.slice(0, 7)}`;
			const configWithoutLabel = _.cloneDeep(config);
			delete configWithoutLabel.app.label;

			const app = new Application(genesisBlock, configWithoutLabel);

			expect(app.config.app.label).toBe(label);
		});

		it('should use the same app label if provided', () => {
			const app = new Application(genesisBlock, config);

			expect(app.config.app.label).toBe(config.app.label);
		});

		it('should set default tempPath if not provided', () => {
			// Arrange
			const tempPath = '/tmp/lisk';
			const configWithoutTempPath = _.cloneDeep(config);
			delete configWithoutTempPath.app.tempPath;

			// Act
			const app = new Application(genesisBlock, configWithoutTempPath);

			// Assert
			expect(app.config.app.tempPath).toBe(tempPath);
		});

		it('should set tempPath if provided', () => {
			// Arragne
			const customTempPath = '/my-lisk-folder';
			const configWithCustomTempPath = _.cloneDeep(config);
			configWithCustomTempPath.app.tempPath = customTempPath;

			// Act
			const app = new Application(genesisBlock, configWithCustomTempPath);

			// Assert
			expect(app.config.app.tempPath).toBe(customTempPath);
		});

		it('should set filename for logger if logger component was not provided', () => {
			// Arrange
			const configWithoutLogger = _.cloneDeep(config);
			configWithoutLogger.components.logger = {};

			// Act
			const app = new Application(genesisBlock, configWithoutLogger);

			// Assert
			expect(app.config.components.logger.logFileName).toBe(
				`${process.cwd()}/logs/${config.app.label}/lisk.log`
			);
		});

		it('should validate the constants', () => {
			const parseEnvArgAndValidateSpy = jest.spyOn(
				validator,
				'parseEnvArgAndValidate'
			);
			new Application(genesisBlock, config);

			expect(parseEnvArgAndValidateSpy).toHaveBeenCalledTimes(1);
			expect(parseEnvArgAndValidateSpy).toHaveBeenCalledWith(
				constantsSchema,
				expect.any(Object)
			);
		});

		it('should merge the constants with genesisConfig and assign it to app constants', () => {
			const customConfig = _.cloneDeep(config);

			customConfig.app.genesisConfig = {
				MAX_TRANSACTIONS_PER_BLOCK: 11,
				EPOCH_TIME: '2016-05-24T17:00:00.000Z',
				BLOCK_TIME: 2,
				REWARDS: {
					MILESTONES: [
						'500000000',
						'400000000',
						'300000000',
						'200000000',
						'100000000',
					],
					OFFSET: 2160,
					DISTANCE: 3000000,
				},
			};

			const app = new Application(genesisBlock, customConfig);

			expect(app.constants.MAX_TRANSACTIONS_PER_BLOCK).toBe(11);
		});

		it('should set internal variables', () => {
			// Act
			const app = new Application(genesisBlock, config);

			// Assert
			expect(app.genesisBlock).toBe(genesisBlock);
			expect(app.controller).toBeNull();
			expect(app.config).toMatchSnapshot();
		});

		it('should contain all framework related transactions.', () => {
			// Act
			const app = new Application(genesisBlock, config);

			// Assert
			expect(Object.keys(app.getTransactions())).toEqual(frameworkTxTypes);
		});

		// Skipped because `new Application` is mutating params.config making the other tests to fail
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('[feature/improve_transactions_processing_efficiency] should throw validation error if constants are overriden by the user', () => {
			const customConfig = _.cloneDeep(config);

			customConfig.app.genesisConfig = {
				CONSTANT: 'aConstant',
			};

			expect(() => {
				new Application(genesisBlock, customConfig);
			}).toThrow('Schema validation error');
		});
	});

	describe('#registerTransaction', () => {
		it('should throw error when transaction class is missing.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			// Act && Assert
			expect(() => app.registerTransaction()).toThrow(
				'Transaction implementation is required'
			);
		});

		it('should throw error when transaction does not satisfy TransactionInterface.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			const TransactionWithoutBase = Object.assign(
				{ prototype: {} },
				DappTransaction
			);

			// Act && Assert
			expect(() => app.registerTransaction(TransactionWithoutBase)).toThrow(
				SchemaValidationError
			);
		});

		it('should throw error when transaction type is missing.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);
			class Sample extends Base {}

			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow(
				'Transaction type is required as an integer'
			);
		});

		it('should throw error when transaction type is not integer.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			class Sample extends Base {}
			Sample.TYPE = 'abc';

			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow(
				'Transaction type is required as an integer'
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

		it('should throw error when transaction type is already registered.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			class Sample extends Base {}
			Sample.TYPE = 1;

			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow(
				'A transaction type "1" is already registered.'
			);
		});

		it('should register transaction when passing a new transaction type and a transaction implementation.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			// Act
			app.registerTransaction(DappTransaction);

			// Assert
			expect(app.getTransaction(5)).toBe(DappTransaction);
		});
	});
});
