const Vorpal = require('vorpal');
const common = require('../common');
const lisky = common.lisky;
const sinon = common.sinon;
const util = common.util;
const get = require('../../commands/get');
const list = require('../../commands/list');

let vorpal = new Vorpal();

vorpal.use(get);
vorpal.use(list);

vorpal
	.delimiter('lisky>')
	.show();

function executeCommand (command, callback) {
	vorpal.exec(command, function(err, data){
		if (!err) {
			return this;
		} else {
			return err;
		}
	});
}


describe('lisky list command palette', () => {

	it('should have the right parameters with account', (done) => {

		let command = 'list accounts 1813095620424213569L 4034636149257692063L';

		let promiseExec = vorpal.exec(command);

		promiseExec.then(result => {
			(result).should.be.length(2);
			done();
		});
	});

	it('should have the right parameters with block', (done) => {

		let command = 'list blocks 261210776798678785 15451307652923255487 5951827295787603085';

		let promiseExec = vorpal.exec(command);

		promiseExec.then(result => {
			(result).should.be.length(3);
			done();
		});

	});

	it('should have the right parameters with delegate', (done) => {

		let command = 'list delegates tosch joel';

		let promiseExec = vorpal.exec(command);

		promiseExec.then(result => {
			(result).should.be.length(2);
			done();
		});

	});

	it('should have the right parameters with delegate', (done) => {

		let command = 'list transactions 3641049113933914102 10995782995100491988';

		let promiseExec = vorpal.exec(command);

		promiseExec.then(result => {
			(result).should.be.length(2);
			done();
		});

	});

});