const Vorpal = require('vorpal');
const encrypt = require('../../src/commands/encrypt');

describe('lisky encrypt command palette', () => {
	let vorpal;
	const commandFilter = command => command._name === 'encrypt';

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(encrypt);
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
	});

	it('should be available', () => {
		const encryptCommands = vorpal.commands.filter(commandFilter);
		(encryptCommands).should.have.length(1);

	});

	it('should require 3 inputs', () => {
		const argsFilter = arg => arg.required;
		const encryptCommand = vorpal.commands.filter(commandFilter)[0];
		const requiredArgs = encryptCommand._args.filter(argsFilter);
		(requiredArgs).should.have.length(3);
	});

});
