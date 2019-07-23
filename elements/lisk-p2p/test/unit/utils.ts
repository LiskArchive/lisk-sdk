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
 *
 */
import { expect } from 'chai';
import {
	getIPGroup,
	isPrivate,
	isLocal,
	getNetwork,
	getIPBytes,
	getNetgroup,
	getBucket,
	NETWORK,
} from '../../src/utils';

describe('utils', () => {
	const IPv4Address = '1.160.10.240';
	const IPv4SourceAddress = '62.13.1.10';
	const privateAddress = '10.0.0.0';
	const localAddress = '127.0.0.1';
	const secret = 123456;

	describe('#getIPGroup', () => {
		it('should return first group when passing 0 in second argument', () => {
			const byte = getIPGroup(IPv4Address, 0);
			return expect(byte).to.eql(1);
		});

		it('should throw an error for second argument greater than 3', () => {
			try {
				getIPGroup(IPv4Address, 4);
			} catch (err) {
				expect(err).to.have.property('message', 'Invalid IP group.');
			}
		});
	});

	describe('#isPrivate', () => {
		it('should return true for private IP address', () => {
			return expect(isPrivate(privateAddress)).to.be.true;
		});
	});

	describe('#isLocal', () => {
		it('should return true for local IP address', () => {
			return expect(isLocal(localAddress)).to.be.true;
		});
	});

	describe('#getNetwork', () => {
		it(`should return ${NETWORK.NET_IPV4} for IPv4 address`, () => {
			return expect(getNetwork(IPv4Address)).to.eql(NETWORK.NET_IPV4);
		});

		it(`should return ${NETWORK.NET_PRIVATE} for private address`, () => {
			return expect(getNetwork(privateAddress)).to.eql(NETWORK.NET_PRIVATE);
		});

		it(`should return ${NETWORK.NET_LOCAL} for local address`, () => {
			return expect(getNetwork(localAddress)).to.eql(NETWORK.NET_LOCAL);
		});
	});

	describe('#getIPBytes', () => {
		it('should return an object with property groupABytes', () => {
			return expect(getIPBytes(IPv4Address)).to.have.property('aBytes');
		});

		it('should return an object with property groupBBytes', () => {
			return expect(getIPBytes(IPv4Address)).to.have.property('bBytes');
		});

		it('should return an object with property groupBBytes', () => {
			return expect(getIPBytes(IPv4Address)).to.have.property('cBytes');
		});

		it('should return an object with property groupBBytes', () => {
			return expect(getIPBytes(IPv4Address)).to.have.property('dBytes');
		});
	});

	describe('#getNetgroup', () => {
		it('should return a number netgroup', () => {
			return expect(getNetgroup(IPv4Address, secret)).to.be.a('number');
		});

		it('should return different netgroup for different addresses', () => {
			const secondIPv4Address = '1.161.10.240';
			const firstNetgroup = getNetgroup(IPv4Address, secret);
			const secondNetgroup = getNetgroup(secondIPv4Address, secret);

			return expect(firstNetgroup).to.not.eql(secondNetgroup);
		});

		it('should return same netgroup for unique local addresses', () => {
			const firstNetgroup = getNetgroup(localAddress, secret);
			const secondLocalAddress = '127.0.1.1';
			const secondNetgroup = getNetgroup(secondLocalAddress, secret);

			return expect(firstNetgroup).to.eql(secondNetgroup);
		});

		it('should return same netgroup for unique private addresses', () => {
			const firstNetgroup = getNetgroup(privateAddress, secret);
			const secondPrivateAddress = '10.0.0.1';
			const secondNetgroup = getNetgroup(secondPrivateAddress, secret);

			return expect(firstNetgroup).to.eql(secondNetgroup);
		});

		it('should return different netgroups for local and private addresses', () => {
			const firstNetgroup = getNetgroup(localAddress, secret);
			const secondNetgroup = getNetgroup(privateAddress, secret);

			return expect(firstNetgroup).to.not.eql(secondNetgroup);
		});
	});

	describe('#getBucket', () => {
		it('should return a bucket number', () => {
			return expect(getBucket({ secret, targetAddress: IPv4Address })).to.be.a(
				'number',
			);
		});

		it('should return different buckets for different target addresses', () => {
			const secondIPv4Address = '1.161.10.240';
			const firstBucket = getBucket({ secret, targetAddress: IPv4Address });
			const secondBucket = getBucket({
				secret,
				targetAddress: secondIPv4Address,
			});

			return expect(firstBucket).to.not.eql(secondBucket);
		});

		it('should return same bucket for unique local target addresses', () => {
			const firstBucket = getBucket({ secret, targetAddress: localAddress });
			const secondLocalAddress = '127.0.1.1';
			const secondBucket = getBucket({
				secret,
				targetAddress: secondLocalAddress,
			});

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return same bucket for unique private target addresses', () => {
			const firstBucket = getBucket({ secret, targetAddress: privateAddress });
			const secondPrivateAddress = '10.0.0.1';
			const secondBucket = getBucket({
				secret,
				targetAddress: secondPrivateAddress,
			});

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return different buckets for local and private target addresses', () => {
			const firstBucket = getBucket({ secret, targetAddress: localAddress });
			const secondBucket = getBucket({ secret, targetAddress: privateAddress });

			return expect(firstBucket).to.not.eql(secondBucket);
		});

		it('should return different buckets for different target addresses given a source address', () => {
			const secondIPv4Address = '1.161.10.240';
			const firstBucket = getBucket({
				secret,
				targetAddress: IPv4Address,
				sourceAddress: IPv4SourceAddress,
			});
			const secondBucket = getBucket({
				secret,
				targetAddress: secondIPv4Address,
				sourceAddress: IPv4SourceAddress,
			});

			return expect(firstBucket).to.not.eql(secondBucket);
		});

		it('should return same bucket for unique local target addresses given a source address', () => {
			const firstBucket = getBucket({
				secret,
				targetAddress: localAddress,
				sourceAddress: IPv4SourceAddress,
			});
			const secondLocalAddress = '127.0.1.1';
			const secondBucket = getBucket({
				secret,
				targetAddress: secondLocalAddress,
				sourceAddress: IPv4SourceAddress,
			});

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return same bucket for unique private target addresses given a source address', () => {
			const firstBucket = getBucket({
				secret,
				targetAddress: privateAddress,
				sourceAddress: IPv4SourceAddress,
			});
			const secondPrivateAddress = '10.0.0.1';
			const secondBucket = getBucket({
				secret,
				targetAddress: secondPrivateAddress,
				sourceAddress: IPv4SourceAddress,
			});

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return different buckets for local and private target addresses given a source address', () => {
			const firstBucket = getBucket({
				secret,
				targetAddress: localAddress,
				sourceAddress: IPv4SourceAddress,
			});
			const secondBucket = getBucket({
				secret,
				targetAddress: privateAddress,
				sourceAddress: IPv4SourceAddress,
			});

			return expect(firstBucket).to.not.eql(secondBucket);
		});
	});
});
