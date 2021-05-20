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
import styles from './Widget.module.scss';

interface Props {
	size?: 'm' | 'l' | 's' | 'xs';
	scrollbar?: boolean;
	mode?: 'dark' | 'light';
}

const WidgetBody: React.FC<Props> = props => {
	const size = props.size ?? 'm';
	const mode = props.mode ?? 'dark';
	const scrollbar = props.scrollbar ?? false;
	const classes = [styles.body, styles[`widget-body-${size}`], styles[`body-${mode}`]];

	if (scrollbar) {
		classes.push(styles['widget-body-scrollbar']);
	}

	return <div className={`${classes.join(' ')}`}>{props.children}</div>;
};

export default WidgetBody;
