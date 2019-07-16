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
	getByte,
	isPrivate,
	isLocal,
	getNetwork,
	getBytes,
	getNetgroup,
	getBucket,
	NETWORK,
} from '../../src/utils';

describe('utils', () => {
	const IPv4Address = '1.160.10.240';
	const privateAddress = '10.0.0.0';
	const localAddress = '127.0.0.1';
	const IPv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
	const secret = 123456;

	describe('#getByte', () => {
		it('should return first group when passing 0 in second argument', () => {
			const byte = getByte(IPv4Address, 0);
			return expect(byte).to.eql(1);
		});

		it('should return undefined for second argument greater than 3', () => {
			const byte = getByte(IPv4Address, 4);
			return expect(byte).to.equal(undefined);
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

	describe('#getBytes', () => {
		it('should return an object with property secretBytes', () => {
			return expect(getBytes(IPv4Address, secret)).to.have.property(
				'secretBytes',
			);
		});

		it('should return an object with property networkBytes', () => {
			return expect(getBytes(IPv4Address, secret)).to.have.property(
				'networkBytes',
			);
		});

		it('should return an object with property groupABytes', () => {
			return expect(getBytes(IPv4Address, secret)).to.have.property(
				'groupABytes',
			);
		});

		it('should return an object with property groupBBytes', () => {
			return expect(getBytes(IPv4Address, secret)).to.have.property(
				'groupBBytes',
			);
		});
	});

	describe('#getNetgroup', () => {
		it('should return a number netgroup', () => {
			return expect(getNetgroup(IPv4Address, secret)).to.be.a('number');
		});

		it('should return undefined for invalid IPv4 address', () => {
			return expect(getNetgroup(IPv6Address, secret)).to.be.undefined;
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
			return expect(getBucket(IPv4Address, secret)).to.be.a('number');
		});

		it('should return undefined for invalid IPv4 address', () => {
			return expect(getBucket(IPv6Address, secret)).to.be.undefined;
		});

		it('should return different buckets for different addresses', () => {
			const secondIPv4Address = '1.161.10.240';
			const firstBucket = getBucket(IPv4Address, secret);
			const secondBucket = getBucket(secondIPv4Address, secret);

			return expect(firstBucket).to.not.eql(secondBucket);
		});

		it('should return same bucket for unique local addresses', () => {
			const firstBucket = getBucket(localAddress, secret);
			const secondLocalAddress = '127.0.1.1';
			const secondBucket = getBucket(secondLocalAddress, secret);

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return same bucket for unique private addresses', () => {
			const firstBucket = getBucket(privateAddress, secret);
			const secondPrivateAddress = '10.0.0.1';
			const secondBucket = getBucket(secondPrivateAddress, secret);

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return different buckets for local and private addresses', () => {
			const firstBucket = getBucket(localAddress, secret);
			const secondBucket = getBucket(privateAddress, secret);

			return expect(firstBucket).to.not.eql(secondBucket);
		});
	});
});
