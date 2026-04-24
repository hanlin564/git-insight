import React, {type ReactNode} from 'react';
import {Box, Text} from 'ink';

type SectionProps = {
	title: string;
	children: ReactNode;
};

export function Section({title, children}: SectionProps) {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text color="green" bold>{title}</Text>
			{children}
		</Box>
	);
}
