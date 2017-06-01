const Vorpal = require('vorpal');
const common = require('../common');
const lisky = common.lisky;
const sinon = common.sinon;
const util = common.util;
const get = require('../../commands/get');
const list = require('../../commands/list');

const vorpal = new Vorpal();

vorpal.use(get);
vorpal.use(list);

vorpal
	.delimiter('lisky>')
	.show();

function executeCommand (command, callback) {
	vorpal.exec(command, function(err, data){
		if (!err) {
			return callback(this);
		} else {
			return err;
		}
	});

}

describe('lisky get command palette', () => {

	it('should test command get account', (done) => {

		let command = 'get account 1813095620424213569L';

		executeCommand(command, function (result) {
			(result._command.command).should.be.equal(command);
			done();
		});

	});

	it('should have the right parameters with account', (done) => {

		let command = 'get account 1813095620424213569L';

		executeCommand(command, function (result) {
			(result._command.args.type).should.be.equal('account');
			(result._command.args.input).should.be.equal('1813095620424213569L');
			done();
		});

	});

	it('should have the right parameters with block', (done) => {

			let command = 'get block 261210776798678785';

		executeCommand(command, function (result) {
			(result._command.args.type).should.be.equal('block');
			(result._command.args.input).should.be.equal('261210776798678785');
			done();
		});

	});

	it('should have the right parameters with delegate', (done) => {

		let command = 'get delegate tosch';

		executeCommand(command, function (result) {
			(result._command.args.type).should.be.equal('delegate');
			(result._command.args.input).should.be.equal('tosch');
			done();
		});

	});

	it('should have the right parameters with delegate', (done) => {

		let command = 'get transaction 3641049113933914102';

		executeCommand(command, function (result) {
			(result._command.args.type).should.be.equal('transaction');
			(result._command.args.input).should.be.equal('3641049113933914102');
			done();
		});

	});


	it('should have the right output with account', (done) => {

		//passphrase: tell pull explain month bulb kite girl use deer area winter purchase
		let command = 'get account 7018558261153309828L';

		let expectedOutput = {
				success: true,
				account:  {
				address: '7018558261153309828L',
					unconfirmedBalance: '1',
					balance: '1',
					publicKey: null,
					unconfirmedSignature: 0,
					secondSignature: 0,
					secondPublicKey: null,
					multisignatures: [],
					u_multisignatures: []
			}
		};

		let result = vorpal.exec(command);

		result.then((output) => {
			(output).should.be.eql(expectedOutput);
			done();
		});

	});

	it('should have the right output with block', (done) => {

		let command = 'get block 1924405132194419123';

		let result = vorpal.exec(command);

		result.then((output) => {
			(output.block.id).should.be.eql('1924405132194419123');
			done();
		});

	});



});

describe('get command palette without test mode', () => {

	beforeEach(() => {
		process.env.NODE_ENV === 'main'
	});

	it('should have the right parameters with transactions, no test mode', (done) => {

		let command = 'get transaction 3641049113933914102';

		let promiseExec = vorpal.exec(command);

		promiseExec.then(result => {
			(result.success).should.be.true;
			done();
		});

	});

	it('should work in normal env', (done) =>  {

		let command = 'get block 1924405132194419123';

		let result = vorpal.exec(command);

		result.then((output) => {
			(output.block.id).should.be.eql('1924405132194419123');
			done();
		});
	});

	it('should work in normal env', (done) =>  {

		let command = 'get block 19244051321919123';

		let result = vorpal.exec(command);

		result.then((output) => {
			(output.success).should.be.false;
			done();
		});
	});

	it('should work in normal env and wrong data', (done) =>  {

		let command = 'get block 123';

		let result = vorpal.exec(command);

		result.then((output) => {
			(output.success).should.be.eql(false);
			done();
		});
	});

	afterEach(() => {
		process.env.NODE_ENV === 'test'
	});
});
