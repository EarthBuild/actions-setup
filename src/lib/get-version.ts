import { Octokit } from '@octokit/core';
import { Endpoints } from '@octokit/types';
import { maxSatisfying } from 'semver';
import { paginateRest } from '@octokit/plugin-paginate-rest';
import * as core from '@actions/core';

export type ReleaseResponse =
  Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][0];

const OctokitWithPaginate = Octokit.plugin(paginateRest);

export async function getVersionObject(
  range: string,
  prerelease: boolean,
): Promise<ReleaseResponse> {
  const octokit = new OctokitWithPaginate({
    auth:
      core.getInput('github-token') || process.env.GITHUB_TOKEN || undefined,
  });

  const releases = await octokit.paginate(
    'GET /repos/{owner}/{repo}/releases',
    {
      owner: 'EarthBuild',
      repo: 'earthbuild',
      per_page: 100,
    },
  );

  const versions = releases
    .filter(
      (release) =>
        (prerelease || !release.prerelease) && release.assets.length > 5,
    )
    .reduce<Record<string, ReleaseResponse>>((acc, cur) => {
      const tag = cur.tag_name.replace(/^v/, '');
      acc[tag] = cur;
      return acc;
    }, {});

  const semverRange = range === 'latest' ? '*' : range;
  const matchedVersionKey = maxSatisfying(Object.keys(versions), semverRange);

  if (!matchedVersionKey || !versions[matchedVersionKey]) {
    throw new Error(
      'Could not find a version that satisfied the version range',
    );
  }

  return versions[matchedVersionKey];
}

/* eslint @typescript-eslint/explicit-module-boundary-types: 0 */
export function invariant(
  condition: unknown,
  message?: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

