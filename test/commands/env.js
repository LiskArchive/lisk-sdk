import Vorpal from 'vorpal';
import fse from 'fs-extra';
import set from '../../src/commands/set';
import env from '../../src/commands/env';

const stringifyConfig = config => JSON.stringify(config, null, '\t');
const writeConfig = (config) => {
	const configString = typeof config === 'string'
		? config
		: stringifyConfig(config);
	fse.writeFileSync('config.json', `${configString}\n`, 'utf8');
};

const initialConfig = stringifyConfig(require('../../config.json'));

const defaultConfig = {
	name: 'lisky',
	json: false,
	liskJS: {
		testnet: false,
	},
};

describe('env command', () => {
	let envCommand;
	let capturedOutput = [];
	let vorpal;
	// eslint-disable-next-line no-underscore-dangle
	const filterCommand = vorpalCommand => vorpalCommand._name === 'env';

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(env);
		vorpal.use(set);
		vorpal.pipe((output) => {
			capturedOutput += output;
			return '';
		});
		envCommand = vorpal.commands.filter(filterCommand)[0];
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
	});

	it('should be available', () => {
		// eslint-disable-next-line no-underscore-dangle
		(envCommand._args).should.be.length(0);
		// eslint-disable-next-line no-underscore-dangle
		(envCommand._name).should.be.equal('env');
	});

	it('should print config file', () => {
		return vorpal.exec('env').then(() => {
			(capturedOutput).should.be.eql(initialConfig);
		});
	});

	describe('should change config file and print updated info', () => {
		const setJsonTrueCommand = 'set json true';

		before(() => {
			writeConfig(defaultConfig);
		});

		after(() => {
			writeConfig(initialConfig);
		});

		it('should print updated config file after change', () => {
			vorpal.execSync(setJsonTrueCommand);

			const expectedUpdatedConfig = {
				name: 'lisky',
				json: true,
				liskJS: {
					testnet: false,
				},
			};

			return vorpal.exec('env').then(() => {
				(capturedOutput).should.be.eql(JSON.stringify(expectedUpdatedConfig, null, '\t'));
			});
		});
	});
});
