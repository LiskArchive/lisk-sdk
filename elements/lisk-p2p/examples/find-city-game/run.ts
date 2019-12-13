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
// tslint:disable
import { p2p as firstP2P, run as runNode1 } from './node1';
import { p2p as secondP2P, run as runNode2 } from './node2';
import { p2p as thirdP2P, run as runNode3 } from './node3';

// It will run 3 nodes that will change their city randomly and also tell the other nodes in which city they are, if they find out that they are in the same city then they stop changing city. The app will stop when all 3 nodes are in the same city.
const runP2PScenario = async () => {
	await runNode1();
	await runNode2();
	await runNode3();
	setInterval(() => {
		console.log(
			`Node 1 is in ${firstP2P.nodeInfo.city}, Node 2 is in ${secondP2P.nodeInfo.city}, Node 3 is in ${thirdP2P.nodeInfo.city}`,
		);
		if (
			firstP2P.nodeInfo.city === secondP2P.nodeInfo.city &&
			secondP2P.nodeInfo.city === thirdP2P.nodeInfo.city &&
			thirdP2P.nodeInfo.city === firstP2P.nodeInfo.city
		) {
			console.log(
				`All 3 nodes are in the same city "${firstP2P.nodeInfo.city}". Shutting down the nodes.`,
			);
			firstP2P.stop();
			secondP2P.stop();
			thirdP2P.stop();
			process.exit();
		}
	}, 3000);
};

runP2PScenario()
	.then(() => {
		console.log('Running the P2P app');
	})
	.catch(err => {
		console.log(err);
		firstP2P.stop();
		secondP2P.stop();
		thirdP2P.stop();
		process.exit(1);
	});
