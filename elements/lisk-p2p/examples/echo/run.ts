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

// Nodes will simply say hi to each other and they will get a response back

const runP2PScenario = async () => {
	await runNode1();
	await runNode2();
	await runNode3();
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
