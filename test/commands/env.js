import Vorpal from 'vorpal';
import env from '../../src/commands/env';
import config from '../../config.json';

describe('env command', () => {
	let envCommand;
	let capturedOutput = '';
	let vorpal;
	// eslint-disable-next-line no-underscore-dangle
	const filterCommand = vorpalCommand => vorpalCommand._name === 'env';

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(env);
		vorpal.pipe((output) => {
			capturedOutput += output;
			return '';
		});
		envCommand = vorpal.commands.filter(filterCommand)[0];
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = '';
	});

	it('should be available', () => {
		// eslint-disable-next-line no-underscore-dangle
		(envCommand._args).should.be.length(0);
		// eslint-disable-next-line no-underscore-dangle
		(envCommand._name).should.be.equal('env');
	});

	it('should print config file', () => {
		vorpal.exec('env');
		(capturedOutput).should.be.eql(JSON.stringify(config));
	});
});
