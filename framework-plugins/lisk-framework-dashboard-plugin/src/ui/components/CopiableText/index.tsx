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
import styles from './CopiableText.module.scss';
import Icon, { Props as IconProps } from '../Icon';
import Text, { Props as TextProps } from '../Text';

const COPIED_TEXT = 'Copied';

export interface Props extends Partial<IconProps>, TextProps {
	text: string;
}

const CopiableText: React.FC<Props> = props => {
	const [hover, setHover] = React.useState(true);
	const [text, setText] = React.useState(props.text);
	let copiedTimeout: NodeJS.Timeout;

	const clipToClipboard = async (textToCopy: string) => {
		setHover(true);
		setText(COPIED_TEXT);
		copiedTimeout = setTimeout(() => {
			setText(textToCopy);
		}, 2000);
		await navigator.clipboard.writeText(textToCopy);
	};

	React.useEffect(() => clearTimeout(copiedTimeout));

	return (
		<div
			className={styles.clickableContainer}
			onMouseOver={() => (text === COPIED_TEXT ? setHover(true) : setHover(false))}
			onMouseOut={() => setHover(true)}
		>
			<span className={styles.clickableRow}>
				<Text color={props.color} type={props.type}>
					{text}
				</Text>
			</span>
			<span
				className={`${styles.clickableRow} ${styles.clickable}`}
				hidden={hover}
				onClick={async () => clipToClipboard(text)}
			>
				<Icon name={'content_copy'} size={props.size}></Icon>
			</span>
		</div>
	);
};

export default CopiableText;
