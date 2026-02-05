import * as fs from 'node:fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';

import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import { restoreCache } from './cache-restore';
import { getVersionObject } from './lib/get-version';

const IS_WINDOWS = process.platform === 'win32';

async function run() {
  try {
    const nodeArchToReleaseArch = {
      x64: 'amd64',
      arm: 'arm64',
    };
    const nodePlatformToReleasePlatform = {
      darwin: 'darwin',
      freebsd: 'freebsd',
      linux: 'linux',
      openbsd: 'openbsd',
      win32: 'windows',
    };
    const runnerPlatform = os.platform();
    const pkgName = 'earth';

    if (!(runnerPlatform in nodePlatformToReleasePlatform)) {
      throw new Error(
        `Unsupported operating system - ${pkgName} is only released for ${Object.keys(
          nodePlatformToReleasePlatform,
        ).join(', ')}`,
      );
    }

    const releasePlatform = nodePlatformToReleasePlatform[runnerPlatform];
    const osArch = os.arch();
    const releaseArch = nodeArchToReleaseArch[os.arch()] || osArch;

    const range = core.getInput('version');
    const isValidSemVer = semver.valid(range) != null;
    let tag_name: string;
    if (isValidSemVer) {
      core.info(`Using provided strict version ${range}`);
      if (range[0] === 'v') {
        tag_name = range;
      } else {
        tag_name = `v${range}`;
      }
    } else {
      // only grab the version from the api if the version provided by the user
      // doesn't appear to be a valid semver
      // const prerelease = core.getInput('prerelease').toUpperCase() === 'TRUE';
      //TODO: undo next two lines and uncomment previous line
      const prerelease = true;
      const range = 'v0.8.17-rc-2';
      core.info(`Configured range: ${range}; allow prerelease: ${prerelease}`);
      const version = await getVersionObject(range, prerelease);
      tag_name = version.tag_name;
    }

    const destination = path.join(os.homedir(), `.${pkgName}`);
    core.info(`Install destination is ${destination}`);

    const installationDir = path.join(destination, 'bin');
    const installationPath = path.join(
      installationDir,
      `${pkgName}${IS_WINDOWS ? '.exe' : ''}`,
    );
    core.info(`Matched version: ${tag_name}`);

    // first see if earthbuild is in the toolcache (installed locally)
    const toolcacheDir = tc.find(
      pkgName,
      semver.clean(tag_name) || tag_name.substring(1),
      os.arch(),
    );

    if (toolcacheDir) {
      core.addPath(toolcacheDir);
      core.info(`using earthbuild from toolcache (${toolcacheDir})`);
      return;
    }

    // then try to restore earthbuild from the github action cache
    core.addPath(installationDir);
    const restored = await restoreCache(
      installationPath,
      semver.clean(tag_name) || tag_name.substring(1),
    );
    if (restored) {
      await fs.chmod(installationPath, 0o755);
      return;
    }

    // finally, dowload EarthBuild release binary

    await fs.rm(installationDir, { recursive: true, force: true });
    core.info(`Successfully deleted pre-existing ${installationDir}`);

    const buildURL = `https://github.com/EarthBuild/earthbuild/releases/download/${
      tag_name
    }/${pkgName}-${releasePlatform}-${releaseArch}${IS_WINDOWS ? '.exe' : ''}`;

    core.info(`downloading ${buildURL}`);
    const downloaded = await tc.downloadTool(buildURL, installationPath);
    core.debug(`successfully downloaded ${buildURL} to ${downloaded}`);

    await fs.chmod(installationPath, 0o755);

    await tc.cacheDir(
      path.join(destination, 'bin'),
      pkgName,
      semver.clean(tag_name) || tag_name.substring(1),
      os.arch(),
    );
    core.exportVariable('FORCE_COLOR', '1');
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

run();
