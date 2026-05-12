import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as utils from './cache-utils';
import { State } from './constants';

// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on('uncaughtException', (e) => {
  const warningPrefix = '[warning]';
  core.info(`${warningPrefix}${e.message}`);
});

export async function run() {
  try {
    await cacheBinary();
    await saveBuildkitCache();
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(`unknown error: ${String(error)}`);
    }
  }
}

export const cacheBinary = async () => {
  if (!utils.isCacheFeatureAvailable()) {
    return;
  }

  if (core.getInput('use-cache') !== 'true') {
    core.info(`skipping cache save as use-cache is not true`);
    return;
  }

  const state = core.getState(State.CacheMatchedKey);
  const primaryKey = core.getState(State.CachePrimaryKey);
  const path = core.getState(State.BinaryPath);

  core.debug(
    `checking if cache hit occurred. primaryKey: ${primaryKey}, state: ${state}`,
  );
  if (primaryKey === state) {
    core.info(
      `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`,
    );
    return;
  }

  if (!fs.existsSync(path)) {
    throw new Error(`Cache folder path doesn't exist on disk: ${path}`);
  }

  try {
    await cache.saveCache([path], primaryKey);
    core.info(`Cache saved with the key: ${primaryKey}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === cache.ValidationError.name) {
        throw error;
      } else if (error.name === cache.ReserveCacheError.name) {
        core.info(error.message);
      } else {
        core.warning(error.message);
      }
    } else {
      core.error(`unknown error encountered: ${String(error)}`);
      throw error;
    }
  }
};

export const saveBuildkitCache = async () => {
  if (!utils.isCacheFeatureAvailable()) {
    return;
  }

  const useBuildkitCache = core.getInput('experimental-buildkit-volume-cache') === 'true';
  if (!useBuildkitCache) {
    return;
  }

  const state = core.getState(State.BuildkitCacheMatchedKey);
  const primaryKey = `earth-volume-cache-${process.env.GITHUB_SHA || 'unknown'}`;
  const containerName = process.env.EARTHLY_INSTALLATION_NAME || 'earth-buildkitd';
  const volumeName = 'earth-cache';

  if (primaryKey === state) {
    core.info(
      `Buildkit cache hit occurred on the primary key ${primaryKey}, not saving cache.`,
    );
    return;
  }

  try {
    core.info(`Stopping buildkit container ${containerName}...`);
    await exec.exec('docker', ['stop', containerName], { ignoreReturnCode: true });

    const cacheFile = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'earthbuild-buildkit-cache.tar.zst');
    try {
      const volumePath = `/var/lib/docker/volumes/${volumeName}/_data`;

      core.info(`Compressing buildkit volume ${volumePath} to ${cacheFile}...`);
      await exec.exec('sudo', ['tar', '-c', '--use-compress-program=zstd -T0', '-f', cacheFile, '-C', volumePath, '.']);
      await exec.exec('sudo', ['chmod', '666', cacheFile]);

      await cache.saveCache([cacheFile], primaryKey);
      core.info(`Buildkit cache saved with the key: ${primaryKey}`);
    } finally {
      await fs.promises.rm(cacheFile, { force: true });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === cache.ValidationError.name) {
        throw error;
      } else if (error.name === cache.ReserveCacheError.name) {
        core.info(error.message);
      } else {
        core.warning(error.message);
      }
    } else {
      core.error(`unknown error encountered saving buildkit cache: ${String(error)}`);
      throw error;
    }
  }
};

void run();
