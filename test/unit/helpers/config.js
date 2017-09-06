'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var config = require('../../../helpers/config');

var argvcloneStr = JSON.stringify(process.argv);

describe('config', function () {

	const VERSION = '0.0.0a';

	afterEach(() => {
		process.argv = JSON.parse(argvcloneStr);
	});

	it('should load the referenced config file double dash', function () {
		process.argv.push('--config');
		process.argv.push('./test/unit/helpers/config.mock.data.json');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.port).to.eq(1234);
		expect(appconfig.httpPort).to.be.eq(4321);
		expect(appconfig.address).to.be.eq('0.0.0.0');
		expect(appconfig.fileLogLevel).to.be.eq('MOCKING');
		expect(appconfig.db.database).to.eq('MOCKDB');
		expect(appconfig.peers.list.length).to.eq(1);
		expect(appconfig.peers.list[0].ip).to.eq('127.0.0.101');
		expect(appconfig.peers.list[0].port).to.eq('444');
	});

	it('should override the port with simple dash', function () {
		process.argv.push('-p');
		process.argv.push('9999');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.port).to.eq(9999);
	});

	it('should override the port with double dash', function () {
		process.argv.push('--port');
		process.argv.push('9998');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.port).to.eq(9998);
	});

	it('should override the httpport with simple dash', function () {
		process.argv.push('-h');
		process.argv.push('1999');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.httpPort).to.eq(1999);
	});

	it('should override the database name', function () {
		process.argv.push('--database');
		process.argv.push('unittestdb');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.db.database).to.eq('unittestdb');
	});

	it('should override the ipaddress with simple dash', function () {
		process.argv.push('-a');
		process.argv.push('198.0.0.1');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.address).to.eq('198.0.0.1');
	});

	it('should override the ipaddress with double dash', function () {
		process.argv.push('--address');
		process.argv.push('198.0.0.2');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.address).to.eq('198.0.0.2');
	});

	it('should override the log with simple dash', function () {
		process.argv.push('-l');
		process.argv.push('UNIT_TEST_ORG');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.consoleLogLevel).to.eq('UNIT_TEST_ORG');
	});

	it('should override the log with double dash', function () {
		process.argv.push('--log');
		process.argv.push('UNIT_TEST_ORG');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.consoleLogLevel).to.eq('UNIT_TEST_ORG');
	});

	it('should override the snapshot with double dash', function () {
		process.argv.push('--snapshot');
		process.argv.push('1');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.loading.snapshot).to.eq(1);
	});

	it('should override the peers with double dash', function () {
		process.argv.push('--peers');
		process.argv.push('127.0.0.1:4008,127.0.0.2:6789');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.peers.list.length).to.eq(2);
		expect(appconfig.peers.list[0].ip).to.eq('127.0.0.1');
		expect(appconfig.peers.list[0].port).to.eq('4008');

		expect(appconfig.peers.list[1].ip).to.eq('127.0.0.2');
		expect(appconfig.peers.list[1].port).to.eq('6789');
	});

	it('should override the peers with double dash but defer to the default port', function () {
		process.argv.push('-p');
		process.argv.push('9997');
		process.argv.push('--peers');
		process.argv.push('127.0.0.19');
		var appconfig = config({version: VERSION});
		expect(appconfig).to.not.be.null;
		expect(appconfig.peers.list.length).to.eq(1);
		expect(appconfig.peers.list[0].ip).to.eq('127.0.0.19');
		expect(appconfig.peers.list[0].port).to.eq(9997);
	});
});
