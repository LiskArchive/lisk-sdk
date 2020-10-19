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
	events: { EVENT_MESSAGE_RECEIVED, EVENT_CONNECT_OUTBOUND },
} = require('../../dist-node');
const { run } = require('./node');

/**
 * @description Nodes will greet each other and they will get a response back until someone get 10 hi's in total.
 */
const greetModule = p2pNode => {
	let greetTimeout;
	// Listen to message events
	p2pNode.on(EVENT_MESSAGE_RECEIVED, async message => {
		if (message.event === 'greet') {
			if (message.data.greet === 'bye') {
				console.log(`Node ${message.peerId} is saying bye 👋🏻, gotta go, shutting down...`);
				clearTimeout(greetTimeout);
				p2pNode.send({ event: 'greet', data: { greet: 'bye', count: 10 } });

				await p2pNode.stop();
				console.log(`BYE from ${p2pNode.config.port} 😃\n`);

				return;
			}

			console.log(
				`Received "${message.data.greet}" with count ${message.data.count} from ${message.peerId}`,
			);
			p2pNode.nodeInfo.options['count'] += 1;

			if (p2pNode.nodeInfo.options['count'] === 10) {
				console.log(
					`\nTotal number of greets have reached 10 🎉, closing down node with port ${p2pNode.config.port}\n`,
				);
				clearTimeout(greetTimeout);
				// Tell others that you reached 10 greets
				p2pNode.send({ event: 'greet', data: { greet: 'bye', count: 10 } });
				await p2pNode.stop();

				return;
			}
			// Respond to greet after 3 seconds
			greetTimeout = setTimeout(
				() =>
					p2pNode.sendToPeer(
						{
							event: 'greet',
							data: { greet: 'Hi back', count: p2pNode.nodeInfo.options['count'] },
						},
						message.peerId,
					),
				3000,
			);
		}
	});

	p2pNode.on(EVENT_CONNECT_OUTBOUND, peer => {
		console.log(`${p2pNode.config.port} made an outbound connection with ${peer.peerId}\n`);
		if (peer.sharedState.options && peer.sharedState.options.module === 'greet') {
			console.log(
				`Sending first greet message from ${p2pNode.config.port} on successful connection with ${peer.peerId}\n`,
			);
			// Reply with hi message in a 3 seconds to avoid frequent messaging
			setTimeout(
				() => p2pNode.sendToPeer({ event: 'greet', data: { greet: 'Hi', count: 1 } }, peer.peerId),
				3000,
			);
		}
	});
};

const p2pNodeList = [];
const runEchoNetwork = async (totalSize = 3) => {
	for (let i = 0; i < totalSize; i++) {
		const node = await run(
			4000 + i,
			i === 0 ? [] : [{ ipAddress: '127.0.0.1', port: 4000 + i - 1 }],
		);
		p2pNodeList.push(node);
		greetModule(node);
	}
};

runEchoNetwork()
	.then(() => {
		console.log(
			'Running the Greeting p2p network with 3 nodes that will shutdown on receiving 10 greet messages on any node.\n',
		);
	})
	.catch(async err => {
		console.log(err);
		for (const node of p2pNodeList) {
			await node.stop();
		}
		process.exit(1);
	});
