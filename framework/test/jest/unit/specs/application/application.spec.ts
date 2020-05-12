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
import {
	BaseTransaction as Base,
	TransferTransaction,
	TransactionError,
} from '@liskhq/lisk-transactions';
import * as _ from 'lodash';
import { validator as liskValidator } from '@liskhq/lisk-validator';
import { Application } from '../../../../../src/application/application';
import * as validator from '../../../../../src/application/validator';
import {
	genesisBlockSchema,
	constantsSchema,
} from '../../../../../src/application/schema';
import { SchemaValidationError } from '../../../../../src/errors';
import * as loggerComponent from '../../../../../src/components/logger';
import * as storageComponent from '../../../../../src/components/storage';
import * as networkConfig from '../../../../fixtures/config/devnet/config.json';
import * as genesisBlock from '../../../../fixtures/config/devnet/genesis_block.json';

jest.mock('../../../../../src/components/logger');
jest.mock('../../../../../src/components/storage');
jest.mock('@liskhq/lisk-validator', () => ({
	validator: {
		validate: jest.fn().mockImplementation(() => {
			return [];
		}),
	},
}));

const config: any = {
	...networkConfig,
};

// eslint-disable-next-line
describe('Application', () => {
	// Arrange
	const frameworkTxTypes = ['8', '10', '12', '13', '14', '15'];
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
	(loggerComponent.createLoggerComponent as jest.Mock).mockReturnValue(
		loggerMock,
	);
	(storageComponent.createStorageComponent as jest.Mock).mockReturnValue(
		storageMock,
	);

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

		it('should set default rootPath if not provided', () => {
			// Arrange
			const rootPath = '~/.lisk';
			const configWithoutrootPath = _.cloneDeep(config);
			delete configWithoutrootPath.rootPath;

			// Act
			const app = new Application(genesisBlock, configWithoutrootPath);

			// Assert
			expect(app.config.rootPath).toBe(rootPath);
		});

		it('should set rootPath if provided', () => {
			// Arragne
			const customrootPath = '/my-lisk-folder';
			const configWithCustomrootPath = _.cloneDeep(config);
			configWithCustomrootPath.rootPath = customrootPath;

			// Act
			const app = new Application(genesisBlock, configWithCustomrootPath);

			// Assert
			expect(app.config.rootPath).toBe(customrootPath);
		});

		it('should set filename for logger if logger component was not provided', () => {
			// Arrange
			const configWithoutLogger = _.cloneDeep(config);
			configWithoutLogger.components.logger = {};

			// Act
			const app = new Application(genesisBlock, configWithoutLogger);

			// Assert
			expect(app.config.components.logger.logFileName).toBe(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
			expect(app['_genesisBlock']).toBe(genesisBlock);
			expect(app.config).toMatchSnapshot();
			expect(app['_controller']).toBeUndefined();
			expect(app['_node']).toBeUndefined();
			expect(app['_network']).toBeUndefined();
			expect(app['_channel']).toBeUndefined();
			expect(app['_applicationState']).toBeUndefined();
			expect(app['_migrations']).toBeInstanceOf(Object);
			expect(app['_modules']).toBeInstanceOf(Object);
			expect(app['_transactions']).toBeInstanceOf(Object);
		});

		it('should register http_api module', () => {
			// Act
			const app = new Application(genesisBlock, config);

			// Assert
			expect(Object.keys(app['_modules'])).toEqual(['http_api']);
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
			expect(app['storage']).toBe(storageMock);
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
			expect(() => (app as any).registerTransaction()).toThrow(
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
			TransactionWithoutBase.TYPE = 99;

			// Act && Assert
			expect(() =>
				app.registerTransaction(TransactionWithoutBase as any),
			).toThrow(SchemaValidationError);
		});

		it('should throw error when transaction type is missing.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			class Sample extends Base {
				// eslint-disable-next-line
				public async applyAsset(): Promise<ReadonlyArray<TransactionError>> {
					return [];
				}
				// eslint-disable-next-line
				public validateAsset(): ReadonlyArray<TransactionError> {
					return [];
				}
				// eslint-disable-next-line
				public async undoAsset(): Promise<ReadonlyArray<TransactionError>> {
					return [];
				}
			}
			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow(
				'Transaction type is required as an integer',
			);
		});

		it('should throw error when transaction type is not integer.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			class Sample extends Base {
				// eslint-disable-next-line
				public async applyAsset(): Promise<ReadonlyArray<TransactionError>> {
					return [];
				}
				// eslint-disable-next-line
				public validateAsset(): ReadonlyArray<TransactionError> {
					return [];
				}
				// eslint-disable-next-line
				public async undoAsset(): Promise<ReadonlyArray<TransactionError>> {
					return [];
				}
			}
			Sample.TYPE = 'abc' as any;

			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow(
				'Transaction type is required as an integer',
			);
		});

		it('should throw error when transaction interface does not match.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);
			class Sample extends Base {
				// eslint-disable-next-line
				public async applyAsset(): Promise<ReadonlyArray<TransactionError>> {
					return [];
				}
				// eslint-disable-next-line
				public validateAsset(): ReadonlyArray<TransactionError> {
					return [];
				}
				// eslint-disable-next-line
				public async undoAsset(): Promise<ReadonlyArray<TransactionError>> {
					return [];
				}
			}

			Sample.TYPE = 10;
			Sample.prototype.apply = 'not a function' as any;

			// Act && Assert
			expect(() => app.registerTransaction(Sample)).toThrow();
		});

		it('should register transaction when passing a new transaction type and a transaction implementation.', () => {
			// Arrange
			const app = new Application(genesisBlock, config);

			// Act
			class Sample extends Base {
				// eslint-disable-next-line
				public async applyAsset(): Promise<ReadonlyArray<TransactionError>> {
					return [];
				}
				// eslint-disable-next-line
				public validateAsset(): ReadonlyArray<TransactionError> {
					return [];
				}
				// eslint-disable-next-line
				public async undoAsset(): Promise<ReadonlyArray<TransactionError>> {
					return [];
				}
			}
			Sample.TYPE = 99;
			app.registerTransaction(Sample);

			// Assert
			expect(app.getTransaction(99)).toBe(Sample);
		});
	});

	describe('#_initChannel', () => {
		let app;
		let actionsList: any;

		beforeEach(() => {
			// Arrange
			app = new Application(genesisBlock, config);
			app['_channel'] = app['_initChannel']();
			actionsList = app['_channel'].actionsList;
		});

		it('should create getAccount action', () => {
			// Assert
			expect(actionsList).toContain('getAccount');
		});

		it('should create getAccounts action', () => {
			// Assert
			expect(actionsList).toContain('getAccounts');
		});

		it('should create getBlockByID action', () => {
			// Assert
			expect(actionsList).toContain('getBlockByID');
		});

		it('should create getBlocksByIDs action', () => {
			// Assert
			expect(actionsList).toContain('getBlocksByIDs');
		});

		it('should create getBlockByHeight action', () => {
			// Assert
			expect(actionsList).toContain('getBlockByHeight');
		});

		it('should create getBlocksByHeightBetween action', () => {
			// Assert
			expect(actionsList).toContain('getBlocksByHeightBetween');
		});

		it('should create getTransactionByID action', () => {
			// Assert
			expect(actionsList).toContain('getTransactionByID');
		});

		it('should create getTransactionsByIDs action', () => {
			// Assert
			expect(actionsList).toContain('getTransactionsByIDs');
		});
	});
});
