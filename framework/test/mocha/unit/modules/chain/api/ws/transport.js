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

const TransportWSApi = rewire(
	'../../../../../../../src/modules/chain/api/ws/transport'
);

let transportModuleMock;
let registerRPCEndpointsStub;
let registerEventEndpointsStub;
let wsRPCMock;
let slaveRPCStubStub;

describe('TransportWSApi', () => {
	beforeEach(async () => {
		transportModuleMock = {
			internal: {
				updatePeer: sinonSandbox.stub(),
			},
			shared: {
				blocksCommon: sinonSandbox.stub(),
				blocks: sinonSandbox.stub(),
				getTransactions: sinonSandbox.stub(),
				getSignatures: sinonSandbox.stub(),
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
		new TransportWSApi(transportModuleMock);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	it('should call wsRPC.getServer', async () =>
		expect(wsRPCMock.getServer).to.be.called);

	it('should call registerRPCEndpoints() on wsServer with object that has available RPC functions', async () =>
		expect(registerRPCEndpointsStub).to.be.calledWith({
			blocksCommon: transportModuleMock.shared.blocksCommon,
			blocks: transportModuleMock.shared.blocks,
			getTransactions: transportModuleMock.shared.getTransactions,
			getSignatures: transportModuleMock.shared.getSignatures,
		}));

	it('should call registerEventEndpoints() on wsServer', async () =>
		expect(registerEventEndpointsStub).to.be.calledWith({
			postBlock: transportModuleMock.shared.postBlock,
			postSignatures: transportModuleMock.shared.postSignatures,
			postTransactions: transportModuleMock.shared.postTransactions,
		}));

	it('should call registerRPCEndpoints() on wsServer with slaveRPCStub', async () =>
		expect(registerRPCEndpointsStub).to.be.calledWith(slaveRPCStubStub));
});
