const Vorpal = require('vorpal');
const encrypt = require('../../src/commands/encrypt');
const cryptoModule = require('../../src/utils/cryptoModule');

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

	it('should handle valid parameters', () => {
		sinon.stub(cryptoModule, 'encrypt');

		const message = 'Hello Lisker';
		const secret = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
		const command = `encrypt "${ message }" "${ secret }" "${ recipient }"`;
		vorpal.execSync(command);

		(cryptoModule.encrypt.calledWith(message, secret, recipient))
			.should.be.true();

		cryptoModule.encrypt.restore();
	});

});
