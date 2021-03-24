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
import styles from './CopyText.module.scss';
import Icon from '../Icon';
import Text from '../Text';

interface Props {
	name: string;
	size?: 's' | 'm' | 'l' | 'xl';
	color?: 'green' | 'pink' | 'yellow' | 'blue' | 'white' | 'gray' | 'red';
	type?: 'h1' | 'h2' | 'h3' | 'th' | 'tr' | 'p';
}

const CopyText: React.FC<Props> = (props: Props) => {
	const [hover, setHover] = React.useState(true);
	const [name, setName] = React.useState(props.name);

	const clipToClipboard = async (text: string) => {
		setHover(false);
		setName('Copied');
		setTimeout(() => {
			setName(text);
		}, 2000);
		await navigator.clipboard.writeText(text);
	};

	return (
		<div
			className={styles.clickableContainer}
			onMouseOver={() => setHover(false)}
			onMouseOut={() => setHover(true)}
		>
			<span className={styles.clickableRow}>
				<Text color={props.color} type={props.type}>
					{name}
				</Text>
			</span>
			<span
				className={styles.clickableRow}
				hidden={hover}
				onClick={async () => clipToClipboard(name)}
			>
				<Icon name={'content_copy'} size={props.size}></Icon>
			</span>
		</div>
	);
};

export default CopyText;
