'use strict';

var _  = require('lodash');
var rewire  = require('rewire');
var sinon  = require('sinon');
var expect = require('chai').expect;

var modulesLoader = require('../../common/initModule').modulesLoader;
var TransportRewired = rewire('../../../modules/transport');

describe('transport', function () {

	var transport;
	var transportLogic;
	var loggerMock;

	before(function () {
		transportLogic = {
			blockMock: sinon.mock(),
			transactionMock: sinon.mock(),
			peersMock: sinon.mock()
		};
		loggerMock = {
			debug: sinon.spy(),
			info: sinon.spy(),
			trace: sinon.spy()
		};
	});

	before(function (done) {
		new TransportRewired(function (err, transportModule) {
			transport = transportModule;
			done(err);
		}, _.assign(modulesLoader.scope, {
			logic: {
				block: transportLogic.blockMock,
				transaction: transportLogic.transactionMock,
				peers: transportLogic.peersMock
			},
			logger: loggerMock
		}));
	});

	beforeEach(function () {
		transportLogic.blockMock.reset();
		transportLogic.transactionMock.reset();
		transportLogic.peersMock.reset();
		loggerMock.debug.reset();
		loggerMock.info.reset();
		loggerMock.trace.reset();
	});

	describe('broadcastBlock', function () {

		var broadcastSpy;
		var maxRelaysStub;
		var validParams;
		var validParamsLimit = 1;
		var validBlock;
		var validBlockId = '123';

		beforeEach(function () {
			validParams = {limit: validParamsLimit};
			validBlock = {id: validBlockId};
			broadcastSpy = sinon.stub(TransportRewired.__get__('__private.broadcaster'), 'broadcast');
		});

		afterEach(function () {
			broadcastSpy.restore();
			maxRelaysStub.restore();
		});

		describe('when block broadcast relays exhausted', function () {

			beforeEach(function () {
				maxRelaysStub = sinon.stub(TransportRewired.__get__('__private.broadcaster'), 'maxRelays').returns(true);
				transport.broadcastBlock(validParams, validBlock);
			});

			it('should not call broadcaster.broadcast', function () {
				expect(broadcastSpy.called).to.be.false;
			});
		});

		describe('when block broadcast relays are not exhausted', function () {

			beforeEach(function () {
				maxRelaysStub = sinon.stub(TransportRewired.__get__('__private.broadcaster'), 'maxRelays').returns(false);
				transport.broadcastBlock(validParams, validBlock);
			});

			it('should call logger.info with "Broadcasting block with id: [block.id]"', function () {
				expect(loggerMock.info.calledWith('Broadcasting block with id: ' + validBlockId)).to.be.true;
			});

			it('should call logger.trace with "Transport->broadcastBlock"', function () {
				expect(loggerMock.trace.calledWith('Transport->broadcastBlock')).to.be.true;
			});

			it('should call logger.trace with {block: [block], params: [params]}', function () {
				expect(loggerMock.trace.args[0][1]).eql({block: validBlock, params: validParams});
			});

			it('should call broadcaster.broadcast', function () {
				expect(broadcastSpy.calledOnce).to.be.true;
			});

			it('should call broadcaster.broadcast with params', function () {
				expect(broadcastSpy.calledWith(validParams)).to.be.true;
			});

			it('should call broadcaster.broadcast with expected options', function () {
				expect(broadcastSpy.calledWith({
					api: '/blocks',
					data: {block: validBlock},
					method: 'POST',
					immediate: true,
				})).to.be.true;
			});
		});
	});
});
