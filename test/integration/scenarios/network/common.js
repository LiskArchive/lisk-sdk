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

const childProcess = require('child_process');
const utils = require('../../utils');

const getAllPeers = sockets => {
	return Promise.all(
		sockets.map(socket => {
			if (socket.state === 'open') {
				return socket.call('list', {});
			}
		})
	);
};

const stopNode = nodeName => {
	return childProcess.execSync(`pm2 stop ${nodeName}`);
};

const startNode = nodeName => {
	childProcess.execSync(`pm2 start ${nodeName}`);
};

const restartNode = nodeName => {
	return childProcess.execSync(`pm2 restart ${nodeName}`);
};

const getPeersStatus = peers => {
	return Promise.all(
		peers.map(peer => {
			return utils.http.getNodeStatus(peer.httpPort, peer.ip);
		})
	);
};

const getNodesStatus = (sockets, cb) => {
	getAllPeers(sockets)
		.then(peers => {
			var peersCount = peers.length;
			getPeersStatus(peers)
				.then(peerStatusList => {
					var networkMaxAvgHeight = getMaxAndAvgHeight(peerStatusList);
					var status = {
						peersCount,
						peerStatusList,
						networkMaxAvgHeight,
					};
					cb(null, status);
				})
				.catch(err => {
					cb(err, null);
				});
		})
		.catch(err => {
			cb(err, null);
		});
};

const getMaxAndAvgHeight = peerStatusList => {
	var maxHeight = 1;
	var heightSum = 0;
	var totalPeers = peerStatusList.length;
	peerStatusList.forEach(peerStatus => {
		if (peerStatus.height > maxHeight) {
			maxHeight = peerStatus.height;
		}
		heightSum += peerStatus.height;
	});

	return {
		maxHeight,
		averageHeight: heightSum / totalPeers,
	};
};

module.exports = {
	getAllPeers,
	stopNode,
	startNode,
	restartNode,
	getPeersStatus,
	getNodesStatus,
	getMaxAndAvgHeight,
};
