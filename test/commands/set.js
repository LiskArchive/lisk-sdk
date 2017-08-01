/* eslint-disable arrow-body-style, global-require, import/no-dynamic-require */
import Vorpal from 'vorpal';
import fse from 'fs-extra';
import set from '../../src/commands/set';
import get from '../../src/commands/get';
import liskInstance from '../../src/utils/liskInstance';

const configPath = '../../config.json';
const deleteConfigCache = () => delete require.cache[require.resolve(configPath)];
const stringifyConfig = config => JSON.stringify(config, null, '\t');
const writeConfig = (config) => {
	const configString = typeof config === 'string'
		? config
		: stringifyConfig(config);
	fse.writeFileSync('config.json', `${configString}\n`, 'utf8');
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
writeConfig(defaultConfig);

describe('set command', () => {
	let vorpal;
	let capturedOutput = '';

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(set);
		vorpal.pipe((output) => {
			capturedOutput += output;
			return '';
		});
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = '';
		writeConfig(defaultConfig);
	});

	after(() => {
		writeConfig(initialConfig);
	});

	describe('should exist', () => {
		let setCommand;
		// eslint-disable-next-line no-underscore-dangle
		const filterCommand = vorpalCommand => vorpalCommand._name === 'set';

		beforeEach(() => {
			setCommand = vorpal.commands.filter(filterCommand)[0];
		});

		it('should be available', () => {
			// eslint-disable-next-line no-underscore-dangle
			(setCommand._args).should.be.length(2);
			// eslint-disable-next-line no-underscore-dangle
			(setCommand._name).should.be.equal('set');
		});

		it('should have 2 required inputs', () => {
			// eslint-disable-next-line no-underscore-dangle
			(setCommand._args[0].required).should.be.true();
			// eslint-disable-next-line no-underscore-dangle
			(setCommand._args[1].required).should.be.true();
		});
	});

	it('should handle unknown config variables', () => {
		vorpal.exec('set xxx true', () => {
			(capturedOutput).should.be.equal('Unsupported variable name.');
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

		afterEach(() => {
			deleteConfigCache();
		});

		it('should set json to true', () => {
			return vorpal.exec(setJsonTrueCommand, () => {
				const config = require(configPath);

				(config).should.have.property('json').be.true();
				(capturedOutput).should.be.equal(setJsonTrueResult);
			});
		});

		it('should set json to false', () => {
			return vorpal.exec(setJsonFalseCommand, () => {
				const config = require(configPath);

				(config).should.have.property('json').be.false();
				(capturedOutput).should.be.equal(setJsonFalseResult);
			});
		});

		it('should set json to true and then to false', () => {
			return vorpal.exec(setJsonTrueCommand, () =>
				vorpal.exec(setJsonFalseCommand, () => {
					const config = require(configPath);

					(config).should.have.property('json').be.false();
					(capturedOutput).should.be.equal(`${setJsonTrueResult}${setJsonFalseResult}`);
				}),
			);
		});

		it('should not set json to non-boolean values', () => {
			return vorpal.exec(setJsonTrueCommand, () =>
				vorpal.exec(invalidValueCommand, () => {
					const config = require(configPath);

					(config).should.have.property('json').be.true();
					(capturedOutput).should.be.equal(`${setJsonTrueResult}${invalidValueResult}`);
				}),
			);
		});

		it('should have an immediate effect', () => {
			vorpal.use(get);
			vorpal.execSync(setJsonTrueCommand);

			return vorpal.exec(getDelegateCommand)
				.then(() => {
					(() => JSON.parse(capturedOutput)).should.not.throw();
					const firstCaptureLength = capturedOutput.length;
					vorpal.execSync(setJsonFalseCommand);
					return vorpal.exec(getDelegateCommand)
						.then(() => {
							(() => JSON.parse(capturedOutput.slice(firstCaptureLength))).should.throw();
						});
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
				(config).should.have.property('liskJS').have.property('testnet').be.true();
				(capturedOutput).should.be.equal(setTestnetTrueResult);
			});
		});

		it('should set testnet to false', () => {
			return vorpal.exec(setTestnetFalseCommand, () => {
				const config = require(configPath);

				(stub.calledWithExactly(false)).should.be.true();
				(config).should.have.property('liskJS').have.property('testnet').be.false();
				(capturedOutput).should.be.equal(setTestnetFalseResult);
			});
		});

		it('should not set testnet to non-boolean values', () => {
			return vorpal.exec(setTestnetTrueCommand, () =>
				vorpal.exec(invalidValueCommand, () => {
					const config = require(configPath);

					(stub.calledWithExactly(true)).should.be.true();
					(config).should.have.property('liskJS').have.property('testnet').be.true();
					(capturedOutput).should.be.equal(`${setTestnetTrueResult}${invalidValueResult}`);
				}),
			);
		});
	});
});
