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

	const clipToClipboard = async (event: React.MouseEvent, textToCopy: string) => {
		event.stopPropagation();
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
			className={styles.root}
			onMouseOver={() => (text === COPIED_TEXT ? setHover(true) : setHover(false))}
			onMouseOut={() => setHover(true)}
		>
			<Text color={props.color} type={props.type} className={styles.copyText}>
				{text.substr(0, text.length - 4)}
			</Text>
			<Text color={props.color} type={props.type} className={styles.copyTextIndent}>
				{text.substr(text.length - 4)}
			</Text>
			<div className={`${styles.icon}`} onClick={async event => clipToClipboard(event, text)}>
				<span hidden={hover}>
					<Icon name={'content_copy'} size={props.size}></Icon>
				</span>
			</div>
		</div>
	);
};

export default CopiableText;
