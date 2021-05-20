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
import styles from './Text.module.scss';

export interface Props {
	color?: 'green' | 'pink' | 'yellow' | 'blue' | 'white' | 'gray' | 'platinum_gray' | 'red';
	type?: 'h1' | 'h2' | 'h3' | 'p' | 'tr';
	style?: 'light';
	className?: string;
}

const Text: React.FC<Props> = props => {
	const color = props.color ?? 'white';
	const type = props.type ?? 'p';
	const styleProps = ['root'];
	styleProps.push(type);
	styleProps.push(`color_${color}`);

	if (props.style) {
		styleProps.push(props.style);
	}

	const Tag = ['h1', 'h2', 'h3', 'p'].includes(type) ? type : 'p';
	return (
		<Tag className={`${styleProps.map(prop => styles[prop]).join(' ')} ${props.className ?? ''}`}>
			{props.children}
		</Tag>
	);
};

export default Text;
