/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const rewire = require('rewire');
const chai = require('chai');

const expect = chai.expect;

const TransportWSApi = rewire('../../../../api/ws/transport');

var transportModuleMock;
var registerRPCEndpointsStub;
var registerEventEndpointsStub;
var wsRPCMock;
var slaveRPCStubStub;

describe('TransportWSApi', () => {
	beforeEach(done => {
		transportModuleMock = {
			internal: {
				updatePeer: sinonSandbox.stub(),
			},
			shared: {
				blocksCommon: sinonSandbox.stub(),
				blocks: sinonSandbox.stub(),
				list: sinonSandbox.stub(),
				height: sinonSandbox.stub(),
				getTransactions: sinonSandbox.stub(),
				getSignatures: sinonSandbox.stub(),
				status: sinonSandbox.stub(),
				postBlock: sinonSandbox.stub(),
				postSignatures: sinonSandbox.stub(),
				postTransactions: sinonSandbox.stub(),
			},
		};
		registerRPCEndpointsStub = sinonSandbox.stub();
		registerEventEndpointsStub = sinonSandbox.stub();
		wsRPCMock = {
			getServer: sinonSandbox.stub().returns({
				registerRPCEndpoints: registerRPCEndpointsStub,
				registerEventEndpoints: registerEventEndpointsStub,
			}),
		};
		slaveRPCStubStub = {};
		TransportWSApi.__set__({
			wsRPC: wsRPCMock,
			slaveRPCStub: slaveRPCStubStub,
		});
		TransportWSApi(transportModuleMock);
		done();
	});

	it('should call wsRPC.getServer', () => {
		return expect(wsRPCMock.getServer).to.be.called;
	});

	it('should call registerRPCEndpoints() on wsServer with object that has available RPC functions', () => {
		return expect(registerRPCEndpointsStub).to.be.calledWith({
			updatePeer: transportModuleMock.internal.updatePeer,
			blocksCommon: transportModuleMock.shared.blocksCommon,
			blocks: transportModuleMock.shared.blocks,
			list: transportModuleMock.shared.list,
			height: transportModuleMock.shared.height,
			getTransactions: transportModuleMock.shared.getTransactions,
			getSignatures: transportModuleMock.shared.getSignatures,
			status: transportModuleMock.shared.status,
		});
	});

	it('should call registerEventEndpoints() on wsServer', () => {
		return expect(registerEventEndpointsStub).to.be.calledWith({
			postBlock: transportModuleMock.shared.postBlock,
			postSignatures: transportModuleMock.shared.postSignatures,
			postTransactions: transportModuleMock.shared.postTransactions,
		});
	});

	it('should call registerRPCEndpoints() on wsServer with slaveRPCStub', () => {
		return expect(registerRPCEndpointsStub).to.be.calledWith(slaveRPCStubStub);
	});
});
