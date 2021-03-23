/*
 * Copyright © 2021 Lisk Foundation
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

import * as React from 'react';
import Widget from '../Widget';

interface Props {
	onClick?: (event: Event | React.MouseEvent<HTMLTableRowElement>) => void;
}

const RecentBlocks: React.FC<Props> = props => (
	<Widget header={'Recent Blocks'}>
		<table>
			<thead>
				<th>Id</th>
				<th>Created by</th>
				<th>Height</th>
				<th>Txs</th>
			</thead>
			<tbody>
				<tr onClick={props.onClick}>
					<td>b478bd86d5f5bcb587821c...7448</td>
					<td>07875df0d9...5bef</td>
					<td>100</td>
					<td>0</td>
				</tr>
			</tbody>
		</table>
	</Widget>
);

export default RecentBlocks;
