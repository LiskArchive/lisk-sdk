const { DappTransaction } = require('@liskhq/lisk-transactions');

const _ = require('lodash');
const Application = require('../../../../../src/controller/application');
const validator = require('../../../../../src/controller/helpers/validator');
const {
	genesisBlockSchema,
	constantsSchema,
} = require('../../../../../src/controller/schema');

jest.mock('../../../../../src/components/logger');

const networkConfig = require('../../../../fixtures/config/devnet/config');
const genesisBlock = require('../../../../fixtures/config/devnet/genesis_block');

const config = {
	...networkConfig,
	app: {
		label: 'jest-unit',
		version: '1.6.0',
		minVersion: '1.0.0',
		protocolVersion: '1.0',
	},
};
// eslint-disable-next-line
describe.skip('Application', () => {
	// Arrange
	const frameworkTxTypes = ['0', '1', '2', '3', '4'];
	const params = {
		label: 'jest-unit',
		genesisBlock,
		config: [networkConfig, config],
	};

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
			expect(validateSpy).toHaveBeenCalledTimes(1);
			expect(validateSpy).toHaveBeenCalledWith(
				genesisBlockSchema,
				genesisBlock
			);
		});

		it('should set app label with the genesis block payload hash prefixed with `lisk-` if label not provided', () => {
			const label = `lisk-${genesisBlock.payloadHash}`;
			const configWithoutLabel = _.cloneDeep(config);
			delete configWithoutLabel.app.label;

			const app = new Application(genesisBlock, configWithoutLabel);

			expect(app.config.app.label).toBe(label);
		});

		it('should use the same app label if provided', () => {
			const app = new Application(genesisBlock, config);

			expect(app.config.app.label).toBe(config.app.label);
		});

		it('should set filename for logger if logger component was not provided', () => {
			// Arrange
			const configWithoutLogger = _.cloneDeep(config);
			delete configWithoutLogger.components.logger;

			// Act
			const app = new Application(genesisBlock, configWithoutLogger);

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
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.config
			);

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
		it('should throw error when transaction type is missing.', () => {
			// Arrange
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.config
			);

			// Act && Assert
			expect(() => app.registerTransaction()).toThrow(
				'Transaction type is required as an integer'
			);
		});

		it('should throw error when transaction type is not integer.', () => {
			// Arrange
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.config
			);

			// Act && Assert
			expect(() => app.registerTransaction('5')).toThrow(
				'Transaction type is required as an integer'
			);
		});

		it('should throw error when transaction class is missing.', () => {
			// Arrange
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.config
			);

			// Act && Assert
			expect(() => app.registerTransaction(5)).toThrow(
				'Transaction implementation is required'
			);
		});

		it('should throw error when transaction type is already registered.', () => {
			// Arrange
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.config
			);

			// Act && Assert
			expect(() => app.registerTransaction(1, DappTransaction)).toThrow(
				'A transaction type "1" is already registered.'
			);
		});

		it('should register transaction when passing a new transaction type and a transaction implementation.', () => {
			// Arrange
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.config
			);

			// Act
			app.registerTransaction(5, DappTransaction);

			// Assert
			expect(app.getTransaction(5)).toBe(DappTransaction);
		});
	});
});
