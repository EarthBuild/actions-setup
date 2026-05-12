import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'node:fs/promises';
import * as os from 'os';
import * as path from 'path';
import { State } from './constants';

import * as utils from './cache-utils';

export const restoreCache = async (
  path: string,
  version: string,
): Promise<boolean> => {
  if (!utils.isCacheFeatureAvailable()) {
    return false;
  }

  const platform = process.env.RUNNER_OS ?? 'unknown';
  const arch = process.env.RUNNER_ARCH ?? 'unknown';

  const primaryKey = `earthbuild-cache-${platform}-${arch}-${version}`;
  core.debug(`primary key is ${primaryKey}`);

  core.saveState(State.CachePrimaryKey, primaryKey);
  core.saveState(State.BinaryPath, path);

  const cacheKey = await cache.restoreCache([path], primaryKey);
  core.setOutput('cache-hit', Boolean(cacheKey));

  if (!cacheKey) {
    core.info('EarthBuild cache is not found');
    return false;
  }

  core.saveState(State.CacheMatchedKey, cacheKey);
  core.info(`Cache restored from key: ${cacheKey}`);
  return Boolean(cacheKey);
};

export const restoreBuildkitCache = async (): Promise<boolean> => {
  if (!utils.isCacheFeatureAvailable()) {
    return false;
  }

  const useBuildkitCache = core.getInput('experimental-buildkit-volume-cache') === 'true';
  if (!useBuildkitCache) {
    return false;
  }

  const cacheKeyInput = `earth-volume-cache-${process.env.GITHUB_SHA || 'unknown'}`;
  const restoreKeys = ['earth-volume-cache-'];
  const volumeName = 'earth-cache';

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'earthbuild-cache-'));
  try {
    const cacheFile = path.join(tempDir, 'earth-cache.tar.zst');

    const cacheKey = await cache.restoreCache([cacheFile], cacheKeyInput, restoreKeys);

    if (!cacheKey) {
      core.info('EarthBuild buildkit volume cache not found');
      return false;
    }

    core.saveState(State.BuildkitCacheMatchedKey, cacheKey);
    core.info(`Buildkit cache restored from key: ${cacheKey}`);

    const volumePath = `/var/lib/docker/volumes/${volumeName}/_data`;
    core.info(`Extracting cache to ${volumePath}`);

    await exec.exec('sudo', ['mkdir', '-p', volumePath]);

    try {
      await fs.access(cacheFile);
      await exec.exec('sudo', ['tar', '-xf', cacheFile, '-C', volumePath]);
      core.info('Buildkit cache successfully extracted');
    } catch (err) {
      core.warning(`Failed to extract buildkit cache: ${String(err)}`);
    }

    return true;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
