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

const path = require('path');

const migrations = [
	path.join(path.dirname(__filename), './sql/20160723182902_create_schema.sql'),
	path.join(
		path.dirname(__filename),
		'./sql/20161016133824_add_broadhash_column_to_peers.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20170113181857_add_constraints_to_peers.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20171207000001_remove_peers_dapp_table.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20171227155620_rename_port_to_ws_port.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180205000002_add_height_column_to_peers.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20180327170000_support_long_peer_version_numbers.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20181106000006_change_wsport_type_in_peers.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20190103000001_drop_peers_clock.sql'
	),
	path.join(
		path.dirname(__filename),
		'./sql/20190111111557_add_protocolVersion_column_to_peers.sql'
	),
];

module.exports = {
	migrations,
};
