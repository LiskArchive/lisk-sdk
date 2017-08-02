/* eslint-disable global-require, import/no-dynamic-require */
import fse from 'fs-extra';
import set from '../../src/commands/set';
import get from '../../src/commands/get';
import liskInstance from '../../src/utils/liskInstance';
import { setUpVorpalWithCommand } from './utils';

const configPath = '../../config.json';
const deleteConfigCache = () => delete require.cache[require.resolve(configPath)];
const stringifyConfig = config => JSON.stringify(config, null, '\t');
const writeConfig = (config) => {
	const configString = typeof config === 'string'
		? config
		: stringifyConfig(config);
	fse.writeFile('config.json', `${configString}\n`, 'utf8');
};

const initialConfig = stringifyConfig(require(configPath));
deleteConfigCache();

const defaultConfig = {
	name: 'lisky',
	json: false,
	liskJS: {
		testnet: false,
	},
};

describe('set command', () => {
	let vorpal;
	let capturedOutput = [];

	before(() => {
		return writeConfig(defaultConfig);
	});

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(set, capturedOutput);
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
		return writeConfig(defaultConfig);
	});

	after(() => {
		return writeConfig(initialConfig);
	});

	describe('should exist', () => {
		/* eslint-disable no-underscore-dangle */
		const filterCommand = vorpalCommand => vorpalCommand._name === 'set';
		let setCommand;

		beforeEach(() => {
			setCommand = vorpal.commands.filter(filterCommand)[0];
		});

		it('should be available', () => {
			(setCommand._args).should.be.length(2);
			(setCommand._name).should.be.equal('set');
		});

		it('should have 2 required inputs', () => {
			(setCommand._args[0].required).should.be.true();
			(setCommand._args[1].required).should.be.true();
		});
		/* eslint-enable */
	});

	it('should handle unknown config variables', () => {
		const invalidVariableCommand = 'set xxx true';
		return vorpal.exec(invalidVariableCommand, () => {
			(capturedOutput).should.be.eql(['Unsupported variable name.']);
		});
	});

	describe('should set json parameter', () => {
		const setJsonTrueCommand = 'set json true';
		const setJsonFalseCommand = 'set json false';
		const invalidValueCommand = 'set json tru';
		const getDelegateCommand = 'get delegate lightcurve';
		const setJsonTrueResult = 'Successfully set json output to true.';
		const setJsonFalseResult = 'Successfully set json output to false.';
		const invalidValueResult = 'Cannot set json output to tru.';

		const jsonProperty = 'json';

		afterEach(() => {
			deleteConfigCache();
		});

		it('should set json to true', () => {
			return vorpal.exec(setJsonTrueCommand, () => {
				const config = require(configPath);

				(config).should.have.property(jsonProperty).be.true();
				(capturedOutput).should.be.eql([setJsonTrueResult]);
			});
		});

		it('should set json to false', () => {
			return vorpal.exec(setJsonFalseCommand, () => {
				const config = require(configPath);

				(config).should.have.property(jsonProperty).be.false();
				(capturedOutput).should.be.eql([setJsonFalseResult]);
			});
		});

		it('should set json to true and then to false', () => {
			return vorpal.exec(setJsonTrueCommand, () =>
				vorpal.exec(setJsonFalseCommand, () => {
					const config = require(configPath);

					(config).should.have.property(jsonProperty).be.false();
					(capturedOutput).should.be.eql([setJsonTrueResult, setJsonFalseResult]);
				}),
			);
		});

		it('should not set json to non-boolean values', () => {
			return vorpal.exec(setJsonTrueCommand, () =>
				vorpal.exec(invalidValueCommand, () => {
					const config = require(configPath);

					(config).should.have.property(jsonProperty).be.true();
					(capturedOutput).should.be.eql([setJsonTrueResult, invalidValueResult]);
				}),
			);
		});

		it('should have an immediate effect', () => {
			vorpal.use(get);

			return vorpal.exec(setJsonTrueCommand)
				.then(() => vorpal.exec(getDelegateCommand))
				.then(() => {
					(() => JSON.parse(capturedOutput[1])).should.not.throw();
					return vorpal.exec(setJsonFalseCommand);
				})
				.then(() => vorpal.exec(getDelegateCommand))
				.then(() => {
					(() => JSON.parse(capturedOutput[3])).should.throw();
				});
		});
	});

	describe('switch testnet and mainnet', () => {
		const setTestnetTrueCommand = 'set testnet true';
		const setTestnetFalseCommand = 'set testnet false';
		const invalidValueCommand = 'set testnet tru';
		const setTestnetTrueResult = 'Successfully set testnet to true.';
		const setTestnetFalseResult = 'Successfully set testnet to false.';
		const invalidValueResult = 'Cannot set testnet to tru.';

		const testnetProperties = ['liskJS', 'testnet'];

		let stub;

		beforeEach(() => {
			stub = sinon.stub(liskInstance, 'setTestnet');
		});

		afterEach(() => {
			stub.restore();
			deleteConfigCache();
		});

		it('should set testnet to true', () => {
			return vorpal.exec(setTestnetTrueCommand, () => {
				const config = require(configPath);

				(stub.calledWithExactly(true)).should.be.true();
				(config)
					.should.have.property(testnetProperties[0])
					.have.property(testnetProperties[1])
					.be.true();
				(capturedOutput).should.be.eql([setTestnetTrueResult]);
			});
		});

		it('should set testnet to false', () => {
			return vorpal.exec(setTestnetFalseCommand, () => {
				const config = require(configPath);

				(stub.calledWithExactly(false)).should.be.true();
				(config)
					.should.have.property(testnetProperties[0])
					.have.property(testnetProperties[1])
					.be.false();
				(capturedOutput).should.be.eql([setTestnetFalseResult]);
			});
		});

		it('should not set testnet to non-boolean values', () => {
			return vorpal.exec(setTestnetTrueCommand, () =>
				vorpal.exec(invalidValueCommand, () => {
					const config = require(configPath);

					(stub.calledWithExactly(true)).should.be.true();
					(config)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
					(capturedOutput).should.be.eql([setTestnetTrueResult, invalidValueResult]);
				}),
			);
		});
	});
});
