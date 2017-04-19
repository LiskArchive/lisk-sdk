'use strict';

var config = require('../../../config.json');

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');

var WAMPClient = require('wamp-socket-cluster').WAMPClient;

var wsRPC = require('../../../api/RPC');


describe('WsRPC', function () {

	describe('constructor', function () {

		it('should have empty wsClientsConnectionsMap field', function () {
			expect(wsRPC).to.have.property('wsClientsConnectionsMap').to.be.a('object').and.to.be.empty;
		});

		it('should have wampClient field of instance WAMPClient', function () {
			expect(wsRPC).to.have.property('wampClient').and.to.be.a('object');
			expect(wsRPC.wampClient.constructor.name).equal('WAMPClient');
		});

		it('should have scClient field without connections', function () {
			expect(wsRPC).to.have.property('scClient').and.to.be.a('object');
			expect(wsRPC).to.have.deep.property('scClient.connections').to.be.a('object').and.to.be.empty;
		});

	});

	describe('shared', function () {

		describe('sendToPeer', function () {

			var validPeer, validProcedure, validData;

			beforeEach(function () {

				validPeer = {
					ip: '127.0.0.1',
					port: 4000
				};

				validProcedure = 'procedureA';

				validData = 'valid string';
			});

			it('should fail when no socket connection is registered', function (done) {
				wsRPC.shared.sendToPeer(validPeer, validProcedure, validData)
					.then(function (res) {
						done(res);
					})
					.catch(function (err) {
						expect(err).to.be.empty;
						done();
					});
			});

			var validWAMPSocket, validSocketId = 'abc';

			beforeEach(function () {
				validWAMPSocket = {
					wampSend: sinon.stub().resolves(true)
				};
			});

			var registerValidConnection = function (validPeer, validSocketId, validWAMPSocket) {
				wsRPC.wsClientsConnectionsMap[validPeer.ip + ':' + validPeer.port] = validSocketId;
				wsRPC.scClient.connections[validSocketId] = validWAMPSocket;
			};


			it('should call wampSend on socket when called registered peer connection', function (done) {
				registerValidConnection(validPeer, validSocketId, validWAMPSocket);
				wsRPC.shared.sendToPeer(validPeer, validProcedure, validData)
					.then(function (res) {

						expect(res).to.be.ok;
						done();
					})
					.catch(function (err) {
						done(err || 'should not reject it');
					});
			});


		});
	});
});
