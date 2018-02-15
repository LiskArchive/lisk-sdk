/*
 * Copyright © 2017 Lisk Foundation
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

/*
api({}).accounts.get(query);
api({}).accounts.getMultiSignitureGroup(address);
api({}).accounts.getMultiSignitureMembership(address);

api({}).blocks.get(query);

api({}).dapps.get();

api({}).delegates.get(query);
api({}).delegates.getForgers(query);
api({}).delegates.getForgingStatus(address, query);

api({}).nodes.getConstants();
api({}).nodes.getStatus();
api({}).nodes.getForgingStatus(query);
api({}).nodes.createForgingStatus(body);

api({}).peers.get(query);

api({}).queues.get(state, query);

api({}).signatures.create(body);

api({}).transactions.get(query);
api({}).transactions.create(body);

api({}).votes.get(query);
api({}).voters.get(query);

*/

import * as liskAPI from './liskApi';

export default liskAPI;
