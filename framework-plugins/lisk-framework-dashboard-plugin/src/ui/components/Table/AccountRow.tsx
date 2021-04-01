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
import CopiableText from '../CopiableText';
import Grid from '../Grid';
import { RowProps } from '../../types';

const AccountRow: React.FC<RowProps> = props => {
	const { data, key } = props;

	return (
		<Grid row rowBorder key={key}>
			{Object.values(data).map(item => (
				<Grid md={3} xs={6}>
					<CopiableText text={item}>{item}</CopiableText>
				</Grid>
			))}
		</Grid>
	);
};

export default AccountRow;
