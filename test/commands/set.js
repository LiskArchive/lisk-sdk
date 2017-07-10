const Vorpal = require('vorpal');
const set = require('../../src/commands/set');

describe('set command', () => {
	let vorpal;

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(set);
		vorpal.pipe(output => '');
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
	});

	describe('should exist', () => {
		let setCommand;
		const filterCommand = vorpalCommand => vorpalCommand._name === 'set';

		beforeEach(() => {
			setCommand = vorpal.commands.filter(filterCommand)[0];
		});

		it('should be available', () => {
			(setCommand._args).should.be.length(2);
			(setCommand._name).should.be.equal('set');

		});

		it('should have 2 require inputs', () => {
			(setCommand._args[0].required).should.be.true();
			(setCommand._args[1].required).should.be.true();
		});

	});

	describe('should set json to true', () => {
		const setJsonTrueCommand = 'set json true';
		const setJsonFalseCommand = 'set json false';
		const setJsonTrueResult = 'successfully set json output to true';
		const setJsonFalseResult = 'successfully set json output to false';

		it('should be set json true and give feedback', () => {
			const result = vorpal.execSync(setJsonTrueCommand);
			(result).should.be.equal(setJsonTrueResult);

		});

		it('should be set json back to false and give feedback', () => {
			const result = vorpal.execSync(setJsonFalseCommand);
			(result).should.be.equal(setJsonFalseResult);

		});

		it('should be set json back to false and give feedback', () => {
			const result = vorpal.execSync(setJsonFalseCommand);
			(result).should.be.equal(setJsonFalseResult);

		});

		it('should be set json back to false and give feedback asynchronous', () => {
			return vorpal.exec(setJsonFalseCommand, function (result) {
				(result).should.be.equal(setJsonFalseResult);
			});
		});

	});

	describe('switch testnet and mainnet', () => {

		it('should set testnet to true', () => {
			const command = 'set testnet true';

			const result = vorpal.execSync(command);

			(result).should.be.equal('successfully set testnet to true');
		});

		it('should set testnet to false', () => {
			const command = 'set testnet false';

			const result = vorpal.execSync(command);

			(result).should.be.equal('successfully set testnet to false');
		});

	});

});
