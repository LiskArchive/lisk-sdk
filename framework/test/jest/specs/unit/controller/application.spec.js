const Application = require('../../../../../src/controller/application');
const validator = require('../../../../../src/controller/helpers/validator');
const applicationSchema = require('../../../../../src/controller/schema/application');
const constantsSchema = require('../../../../../src/controller/schema/constants');
const version = require('../../../../../src/version');

jest.mock('../../../../../src/components/logger');
jest.mock('../../../../../src/controller/helpers/validator');

describe('Application', () => {
	// Arrange
	const params = {
		label: 'jest-unit',
		genesisBlock: {},
		constants: {},
		config: { components: { logger: null } },
	};

	describe('#constructor', () => {
		it('should accept function as label argument', () => {
			// Arrange
			const labelFn = () => 'jest-unit';

			// Act
			const app = new Application(
				labelFn,
				params.genesisBlock,
				params.constants,
				params.config
			);

			expect(app.label).toBe(labelFn());
		});

		it('should set filename for logger if logger component was not provided', () => {
			// Arrange
			const config = { components: {} };

			// Act
			// eslint-disable-next-line no-unused-vars
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.constants,
				config
			);

			expect(config.components.logger.filename).toBe(
				`logs/${params.label}/lisk.log`
			);
		});

		it('should set global.constants variable with given constants object', () => {
			// Act
			// eslint-disable-next-line no-unused-vars
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.constants,
				params.config
			);

			expect(global.constants).toBe(params.constants);
		});

		it('should load applicationSchema', () => {
			// Act
			// eslint-disable-next-line no-unused-vars
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.constants,
				params.config
			);

			// Assert
			expect(validator.loadSchema).toHaveBeenCalledWith(applicationSchema);
		});

		it('should load constantsSchema', () => {
			// Act
			// eslint-disable-next-line no-unused-vars
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.constants,
				params.config
			);

			// Assert
			expect(validator.loadSchema).toHaveBeenCalledWith(constantsSchema);
		});

		it('should validate constructor arguments', () => {
			// Act
			// eslint-disable-next-line no-unused-vars
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.constants,
				params.config
			);

			// Assert
			expect(validator.validate).toHaveBeenCalledWith(
				applicationSchema.appLabel,
				params.label
			);

			expect(validator.validate).toHaveBeenCalledWith(
				constantsSchema.constants,
				params.constants
			);

			expect(validator.validate).toHaveBeenCalledWith(
				applicationSchema.config,
				params.config
			);

			expect(validator.validate).toHaveBeenCalledWith(
				applicationSchema.genesisBlock,
				params.genesisBlock
			);
		});

		it('should set internal variables', () => {
			// Act
			const app = new Application(
				params.label,
				params.genesisBlock,
				params.constants,
				params.config
			);

			// Assert
			// Investigate if these are implementation details
			expect(app.genesisBlock).toBe(params.genesisBlock);
			expect(app.label).toBe(params.label);
			expect(app.banner).toBe(
				`${params.label || 'LiskApp'} - Lisk Framework(${version})`
			);
			expect(app.config).toBe(params.config);
			expect(app.controller).toBeNull();
		});
	});
});
