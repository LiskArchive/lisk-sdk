const Vorpal = require('vorpal');
const encrypt = require('../../src/commands/encrypt');
const cryptoModule = require('../../src/utils/cryptoModule');
const tablify = require('../../src/utils/tablify');

describe('lisky encrypt command palette', () => {
	let vorpal;
	let capturedOutput = '';

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(encrypt);
		vorpal.pipe(output => {
			capturedOutput += output;
			return '';
		});
		vorpal.delimiter('lisky>');
	});

	afterEach(() => {
		capturedOutput = '';
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		const commandFilter = command => command._name === 'encrypt';

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

	describe('when executed', () => {
		const message = 'Hello Lisker';
		const secret = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
		const command = `encrypt "${ message }" "${ secret }" "${ recipient }"`;

		const nonce = '60ee6cbb5f9f0ee3736a6ffd20317f59ebfee2083e819909';
		const encryptedMessage = '4ba04a1c568b66fe5f6e670295cd9945730013f4e3feb5ac0b4e3c';
		const cryptoEncryptReturnObject = {
			nonce,
			encryptedMessage,
		};

		beforeEach(() => {
			sinon
				.stub(cryptoModule, 'encrypt')
				.returns(cryptoEncryptReturnObject);
		});

		afterEach(() => {
			cryptoModule.encrypt.restore();
		});

		it('should handle valid parameters', () => {
			vorpal.execSync(command);
			(cryptoModule.encrypt.calledWithExactly(message, secret, recipient))
				.should.be.true();
		});

		it('should print the returned object', () => {
			const expected = tablify(cryptoEncryptReturnObject).toString();
			return vorpal.exec(command)
				.then(() => (capturedOutput).should.equal(expected));
		});

		it('should print json with --json option', () => {
			const jsonCommand = `${ command } --json`;
			const expected = JSON.stringify(cryptoEncryptReturnObject);
			return vorpal.exec(jsonCommand)
				.then(() => (capturedOutput).should.equal(expected));
		});

		it('should handle a -j shorthand for --json option', () => {
			const jsonCommand = `${ command } -j`;
			const expected = JSON.stringify(cryptoEncryptReturnObject);
			return vorpal.exec(jsonCommand)
				.then(() => (capturedOutput).should.equal(expected));
		});

	});

});
