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
import styles from './Table.module.scss';

interface Props {
	sticky?: boolean;
}

const TableHeader: React.FC<Props> = props => {
	const { sticky } = props;
	const classes = [styles.tableHeader];

	if (sticky) {
		classes.push(styles.tableHeaderSticky);
	}

	return <thead className={classes.join(' ')}>{props.children}</thead>;
};

export default TableHeader;
