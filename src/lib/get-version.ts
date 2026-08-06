import * as core from '@actions/core';
import { Octokit } from '@octokit/core';
import { paginateRest } from '@octokit/plugin-paginate-rest';
import { Endpoints } from '@octokit/types';
import { maxSatisfying } from 'semver';

export type ReleaseResponse =
  Endpoints['GET /repos/{owner}/{repo}/releases']['response']['data'][0];

const OctokitWithPaginate = Octokit.plugin(paginateRest);

export async function getVersionObject(
  range: string,
  includePrerelease: boolean,
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

  const lookup = releases
    .filter(
      (release) =>
        (includePrerelease || !release.prerelease) && release.assets.length > 5,
    )
    .reduce<Record<string, ReleaseResponse>>((acc, cur) => {
      const tag = cur.tag_name.replace(/^v/, '');
      acc[tag] = cur;
      return acc;
    }, {});

  const versions = Object.keys(lookup);
  const semverRange = range === 'latest' ? '*' : range;
  const options = { includePrerelease };
  const matchedVersionKey = maxSatisfying(versions, semverRange, options);

  if (!matchedVersionKey || !lookup[matchedVersionKey]) {
    throw new Error(
      'Could not find a version that satisfied the version range',
    );
  }

  return lookup[matchedVersionKey];
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
