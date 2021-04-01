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
import Text from '../Text';

interface HeaderProps {
	data: string[];
}

const TableHeader: React.FC<HeaderProps> = props => (
	<header>
		{props.data.map(item => (
			<Text type={'th'} key={item}>
				{item}
			</Text>
		))}
	</header>
);

export default TableHeader;
