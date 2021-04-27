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
import styles from './Logo.module.scss';
import logo from '../../logo.svg';

interface Props {
	name?: string;
}

const Logo: React.FC<Props> = (props: Props) => {
	const name = props.name ?? 'Lisk';

	return (
		<div className={styles.wrapper}>
			<img src={logo} alt="Lisk SDK Logo" className={styles.img} />
			<div className={styles.branding}>
				{name && <span className={styles.brandingText}>{name}</span>}
				<span className={styles.brandingText}>Dashboard</span>
			</div>
		</div>
	);
};

export default Logo;
