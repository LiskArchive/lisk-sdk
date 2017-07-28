/* eslint-disable arrow-body-style, global-require, import/no-dynamic-require */
import Vorpal from 'vorpal';
import set from '../../src/commands/set';

const configPath = '../../config.json';

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

	describe('should set json parameter', () => {
		const setJsonTrueCommand = 'set json true';
		const setJsonFalseCommand = 'set json false';
		const setJsonTrueResult = 'Successfully set json output to true';
		const setJsonFalseResult = 'Successfully set json output to false';

		afterEach(() => {
			delete require.cache[require.resolve(configPath)];
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
	});

	describe('switch testnet and mainnet', () => {
		it('should set testnet to true', () => {
			const command = 'set testnet true';

			const result = vorpal.execSync(command);

			(result).should.be.equal('Successfully set testnet to true');
		});

		it('should set testnet to false', () => {
			const command = 'set testnet false';

			const result = vorpal.execSync(command);

			(result).should.be.equal('Successfully set testnet to false');
		});
	});
});
