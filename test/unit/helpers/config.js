'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var config = require('../../../helpers/config');

describe('config is able to override AppConfig properties from the command line', function () {

	var VERSION = '0.0.0a';

	var argvcloneStr = JSON.stringify(process.argv);

	afterEach(() => {
		process.argv = JSON.parse(argvcloneStr);
	});

	describe('standard scenarios', function () {

		function standardExpect (result) {
			describe(result.double.dash , function () {
				it('single dash: [ -' + result.single.dash + ' ]', function () {
					process.argv.push('-' + result.single.dash);
					process.argv.push(result.single.value);
					var appconfig = config({version: VERSION});
					if (result.expect) {
						result.expect('single', appconfig);
					} else {
						expect(result.appConfigValue(appconfig)).to.eq(result.single.value);
					}
				});

				it('double dash: [ --' + result.double.dash + ' ]', function () {
					process.argv.push('--' + result.double.dash);
					process.argv.push(result.double.value);
					var appconfig = config({version: VERSION});
					if (result.expect) {
						result.expect('double', appconfig, result);
					} else {
						expect(result.appConfigValue(appconfig)).to.eq(result.double.value);
					}
				});
			});
		}

		[
			{
				expect: function (type, appconfig, result) {
					expect(appconfig.port).to.eq(1234);
					expect(appconfig.httpPort).to.be.eq(4321);
					expect(appconfig.address).to.be.eq('0.0.0.0');
					expect(appconfig.fileLogLevel).to.be.eq('MOCKING');
					expect(appconfig.db.database).to.eq('MOCKDB');
					expect(appconfig.peers.list.length).to.eq(1);
					expect(appconfig.peers.list[0].ip).to.eq('127.0.0.101');
					expect(appconfig.peers.list[0].port).to.eq('444');
				},
				single: {
					dash: 'c',
					value: './test/unit/helpers/config.mock.data.json'
				},
				double: {
					dash: 'config',
					value: './test/unit/helpers/config.mock.data.json'
				}
			},{
				appConfigValue: function (appconfig) {
					return appconfig.port;
				},
				single: {
					dash: 'p',
					value: 9999
				},
				double: {
					dash: 'port',
					value: 9998
				}
			},{
				appConfigValue: function (appconfig) {
					return appconfig.httpPort;
				},
				single: {
					dash: 'h',
					value: 1999
				},
				double: {
					dash: 'http-port',
					value: 1998
				}
			},{
				appConfigValue: function (appconfig) {
					return appconfig.db.database;
				},
				single: {
					dash: 'd',
					value: 'database1'
				},
				double: {
					dash: 'database',
					value: 'database2'
				}
			},{
				appConfigValue: function (appconfig) {
					return appconfig.address;
				},
				single: {
					dash: 'a',
					value: '127.0.0.1'
				},
				double: {
					dash: 'address',
					value: '127.0.0.2'
				}
			},{
				appConfigValue: function (appconfig) {
					return appconfig.consoleLogLevel;
				},
				single: {
					dash: 'l',
					value: 'SINGLE_LOG'
				},
				double: {
					dash: 'log',
					value: 'DOUBLE_LOG'
				}
			},{
				appConfigValue: function (appconfig) {
					return appconfig.loading.snapshot;
				},
				single: {
					dash: 's',
					value: 1
				},
				double: {
					dash: 'snapshot',
					value: 2
				}
			},{
				expect: function (type, appconfig, result) {
					var startsWith = '127';
					var ports = ['4008', '4009'];
					if (type === 'double') {
						startsWith = '128';
						ports = ['4010', '4011'];
					}
					expect(appconfig.peers.list.length).to.eq(2);
					expect(appconfig.peers.list[0].ip).to.eq(startsWith + '.0.0.1');
					expect(appconfig.peers.list[1].ip).to.eq(startsWith + '.0.0.2');
					expect(appconfig.peers.list[0].port).to.eq(ports[0]);
					expect(appconfig.peers.list[1].port).to.eq(ports[1]);
				},
				single: {
					dash: 'x',
					value: '127.0.0.1:4008,127.0.0.2:4009'
				},
				double: {
					dash: 'peers',
					value: '128.0.0.1:4010,128.0.0.2:4011'
				}
			}
		].forEach( function (result){
			standardExpect(result);
		});
	});

	describe('addition default port for peers if no port is provided', function () {

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
});
