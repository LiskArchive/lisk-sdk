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

});
