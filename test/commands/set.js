const Vorpal = require('vorpal');
const common = require('../common');
const lisky = common.lisky;
const set = require('../../src/commands/set');

const vorpal = new Vorpal();

vorpal.use(set);

vorpal
	.delimiter('lisky>')
	.show();

function executeCommand (command, callback) {
	vorpal.exec(command, function (err, data){
		if (!err) {
			return callback(this);
		} else {
			return err;
		}
	});

}

describe('set command', () => {

	describe('should exist', () => {

		const filterCommand = vorpalCommand => vorpalCommand._name === 'set';

		let exists = vorpal.commands.filter(filterCommand);

		it('should be available', () => {

			(exists[0]._args).should.be.length(2);
			(exists[0]._name).should.be.equal('set');

		});

		it('should have 2 require inputs', () => {

			(exists[0]._args[0].required).should.be.true;
			(exists[0]._args[1].required).should.be.true;

		});

	});

	describe('should set json to true', () => {

		it('should be set json true and give feedback', () => {

			let command = 'set json true';

			let res = vorpal.execSync(command);
			(res).should.be.equal('successfully set json output to true');

		});

		it('should be set json back to false and give feedback', () => {

			let command = 'set json false';

			let res = vorpal.execSync(command);
			(res).should.be.equal('successfully set json output to false');

		});

		it('should be set json back to false and give feedback', () => {

			let command = 'set json false';

			let res = vorpal.execSync(command);
			(res).should.be.equal('successfully set json output to false');

		});

		it('should be set json back to false and give feedback asynchronous', (done) => {

			let command = 'set json false';

			vorpal.exec(command, function (result) {
				(result).should.be.equal('successfully set json output to false');
				done();
			});


		});

	});

	describe('switch testnet and mainnet', () => {

		it('should set testnet to true', () => {

			let command = 'set testnet true';

			let res = vorpal.execSync(command);
			(res).should.be.equal('successfully set testnet to true');

		});

		it('should set testnet to false', () => {

			let command = 'set testnet false';

			let res = vorpal.execSync(command);
			(res).should.be.equal('successfully set testnet to false');

		});

	});

});
