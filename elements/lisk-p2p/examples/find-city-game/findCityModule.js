/*
 * Copyright © 2019 Lisk Foundation
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
const {
	events: { EVENT_MESSAGE_RECEIVED },
} = require('../../dist-node');
const { run, cityRandom } = require('./node');

/**
 * @description A network can be thought of as people who move from city to other and if they find someone in the same city they broadcast it to others and shutdown.
 */
const cityModule = p2pNode => {
	// Getters
	const currentCity = () => p2pNode.nodeInfo.options.city;
	const cityStatus = () => p2pNode.nodeInfo.options.found;
	const nodePort = () => p2pNode.config.port;
	// Setters
	const setCity = city => (p2pNode.nodeInfo.options.city = city);
	const setCityStatus = status => (p2pNode.nodeInfo.options.found = status);

	// Listen to message events
	p2pNode.on(EVENT_MESSAGE_RECEIVED, async message => {
		const { data, peerId, event } = message;
		if (event === 'postNodeInfo' && data.options.found) {
			if (data.options.city === currentCity()) {
				// When some peer finds you in the same city
				console.log(
					`\n${nodePort()}: Peer ${peerId} found me in the city ${
						data.options.city
					}, Shutting down. Bye 👋🏻`,
				);
			} else {
				// When some peer finds some other peer in the same city
				console.log(
					`\n${nodePort()}: Peer ${peerId} found someone in city ${
						data.options.city
					}, moving there. Shutting down. Bye 👋🏻`,
				);
				setCity(data.options.city);
			}
			p2pNode.nodeInfo.options.found = true;
			p2pNode.applyNodeInfo(p2pNode.nodeInfo);
			await stopNode();

			return;
		}

		if (event === 'postNodeInfo' && !cityStatus()) {
			// When you find someone in the same city
			if (data.options.city === currentCity()) {
				console.log(
					`\n${nodePort()}: Found peer 👬 ${peerId} in city ${
						data.options.city
					}, will wait for others now BYE.\n`,
				);
				setCityStatus(true);
				p2pNode.applyNodeInfo(p2pNode.nodeInfo);
				await stopNode();

				return;
			}

			return;
		}
	});

	// Move to another city every 3 seconds and let others know
	const applyNodeInfoInterval = setInterval(() => {
		const current = currentCity();
		setCity(cityRandom());
		console.log(`\n${nodePort()}: moved from ${current} to`, currentCity());
		p2pNode.applyNodeInfo(p2pNode.nodeInfo);
	}, 3000);

	// Shutdown node and cleanup
	const stopNode = async () => {
		clearInterval(applyNodeInfoInterval);
		if (p2pNode.isActive) {
			console.log(`\n${nodePort()}: Shutting down!`);
			await p2pNode.stop();
		}
	};
};

const p2pNodeList = [];
const runFindCityGameNetwork = async (totalSize = 5) => {
	for (let i = 0; i < totalSize; i++) {
		const node = await run(
			4000 + i,
			i === 0 ? [] : [{ ipAddress: '127.0.0.1', port: 4000 + i - 1 }],
			cityRandom(),
		);
		p2pNodeList.push(node);
		cityModule(node);
	}
};

runFindCityGameNetwork(5)
	.then(() => {
		console.log(
			'Running found common city network that will shutdown on finding another peer in the same city.\n',
		);
	})
	.catch(async err => {
		console.log(err);
		for (const node of p2pNodeList) {
			await node.stop();
		}
		process.exit(1);
	});
