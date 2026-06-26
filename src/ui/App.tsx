import path from 'node:path';
import React, {useEffect, useState} from 'react';
import {Box, Text, useApp} from 'ink';
import {collectMyGitData, type MyGitDataResult, type ProgressSnapshot, type PeriodSummary} from '../analysis/myGitData.js';
import type {GitUserIdentity} from '../git/types.js';
import {ContributionHeatmap} from './components/ContributionHeatmap.js';

type AppProps = {
	rootPath: string;
};

const PROGRESS_BAR_WIDTH = 28;

export function App({rootPath}: AppProps) {
	const {exit} = useApp();
	const [progress, setProgress] = useState<ProgressSnapshot>({
		phase: 'scanning',
		scannedDirectories: 0,
		repositoryCount: 0
	});
	const [result, setResult] = useState<MyGitDataResult>();
	const [tick, setTick] = useState(0);

	useEffect(() => {
		let isMounted = true;

		void collectMyGitData(rootPath, nextProgress => {
			if (isMounted) {
				setProgress(nextProgress);
			}
		}).then(nextResult => {
			if (isMounted) {
				if (!nextResult.ok) {
					process.exitCode = 1;
				}

				setResult(nextResult);
			}
		}).catch((error: unknown) => {
			if (isMounted) {
				process.exitCode = 1;
				setResult({ok: false, error: error instanceof Error ? error.message : String(error)});
			}
		});

		return () => {
			isMounted = false;
		};
	}, [rootPath]);

	useEffect(() => {
		if (result) {
			exit();
			return;
		}

		const timer = setInterval(() => {
			setTick(value => value + 1);
		}, 120);

		return () => {
			clearInterval(timer);
		};
	}, [exit, result]);

	if (!result) {
		return <LoadingView rootPath={rootPath} progress={progress} tick={tick} />;
	}

	if (!result.ok) {
		return (
			<Box flexDirection="column">
				<Text color="green" bold>show-my-git-data</Text>
				<Text color="red">{result.error}</Text>
			</Box>
		);
	}

	const {data} = result;

	return (
		<Box flexDirection="column">
			<Text color="green" bold>show-my-git-data</Text>
			<Text>当前用户：<Text color="cyan">{formatGitUser(data.user)}</Text></Text>
			<Text>扫描目录：<Text color="cyan">{data.rootPath}</Text></Text>
			<Text>
				仓库：成功 {data.successfulRepositoryCount} / 共 {data.repositoryCount}
				{data.failedRepositories.length > 0 && <Text color="yellow">，失败 {data.failedRepositories.length}</Text>}
			</Text>
			<Text>统计年份：{data.year}</Text>
			<Text> </Text>

			{data.repositoryCount === 0 && <Text color="yellow">当前目录下未发现 Git 仓库。</Text>}

			<ContributionHeatmap heatmap={data.heatmap} />

			<Box flexDirection="column" marginTop={1}>
				<Text color="cyan" bold>提交概览</Text>
				<SummaryLine summary={data.summaries.today} />
				<SummaryLine summary={data.summaries.last7Days} />
				<SummaryLine summary={data.summaries.last30Days} />
			</Box>

			{data.failedRepositories.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text color="yellow">部分仓库读取失败，已跳过。</Text>
				</Box>
			)}
		</Box>
	);
}

function LoadingView({rootPath, progress, tick}: {
	rootPath: string;
	progress: ProgressSnapshot;
	tick: number;
}) {
	if (progress.phase === 'analyzing') {
		const currentRepository = progress.currentRepository
			? path.relative(rootPath, progress.currentRepository) || path.basename(progress.currentRepository)
			: '';
		const percent = progress.totalRepositories === 0
			? 100
			: Math.round(progress.completedRepositories / progress.totalRepositories * 100);

		return (
			<Box flexDirection="column">
				<Text color="green" bold>show-my-git-data</Text>
				<Text>正在分析仓库 {progress.completedRepositories}/{progress.totalRepositories} ({percent}%)</Text>
				<Text>{renderDeterminateBar(progress.completedRepositories, progress.totalRepositories)}</Text>
				{currentRepository && <Text color="gray">{currentRepository}</Text>}
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text color="green" bold>show-my-git-data</Text>
			<Text>正在扫描仓库… 已检查 {progress.scannedDirectories ?? 0} 个目录，发现 {progress.repositoryCount} 个仓库</Text>
			<Text>{renderIndeterminateBar(tick)}</Text>
			{progress.currentPath && <Text color="gray">{path.relative(rootPath, progress.currentPath) || '.'}</Text>}
		</Box>
	);
}

function SummaryLine({summary}: {summary: PeriodSummary}) {
	return (
		<Text>
			{summary.label}：{summary.commitCount} 次提交，{summary.changedLines} 行代码
		</Text>
	);
}

function renderDeterminateBar(completed: number, total: number): string {
	const ratio = total === 0 ? 1 : Math.min(1, Math.max(0, completed / total));
	const filled = Math.round(PROGRESS_BAR_WIDTH * ratio);
	return `[${'━'.repeat(filled)}${'·'.repeat(PROGRESS_BAR_WIDTH - filled)}]`;
}

function renderIndeterminateBar(tick: number): string {
	const markerWidth = 6;
	const maxStart = PROGRESS_BAR_WIDTH - markerWidth;
	const start = maxStart === 0 ? 0 : tick % (maxStart + 1);
	return `[${'·'.repeat(start)}${'━'.repeat(markerWidth)}${'·'.repeat(PROGRESS_BAR_WIDTH - start - markerWidth)}]`;
}

function formatGitUser(user: GitUserIdentity): string {
	if (user.name && user.email) {
		return `${user.name} <${user.email}>`;
	}

	return user.name ?? user.email ?? '未配置';
}
