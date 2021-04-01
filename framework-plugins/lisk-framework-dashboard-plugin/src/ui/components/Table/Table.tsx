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
import TableHeader from './TableHeader';
import { RowProps } from '../../types';

interface Props {
	data: Record<string, string>[];
	header: string[];
	row: React.FC<RowProps>; // AccountRow, TransactionRow, UnconfirmedTransactionRow
}

const Table: React.FC<Props> = props => {
	const { data, header, row: Row } = props;
	if (data.length === 0) return null;

	return (
		<React.Fragment>
			<TableHeader data={header} />
			{data.map((item, index) => (
				<Row key={index} data={item} />
			))}
		</React.Fragment>
	);
};

export default Table;
