import * as semver from 'semver';
import { getVersionObject } from '../get-version';

// The latest version since this test was last changed
// Feel free to update it if Earthbuild has been updated
const latest = '0.8.17-rc-1';

describe('get-version', () => {
  describe('latest range versions', () => {
    it.each([
      'latest',
      // '*',
      // '^0',
      // '0.*.*',
      // '0.8.*',
      '0.8.17-rc-1',
    ] as const)('should match %s versions', async (ver) => {
      const v = await getVersionObject(ver, true); //TODO: switch off prerelease when have stable release
      expect(semver.gte(v.tag_name, latest));
    });
  });
  describe('range versions', () => {
    it.each([
      // { spec: '0.4.*', gte: '0.4.0', lt: '0.5.0' },
      // { spec: 'v0.4.*', gte: '0.4.0', lt: '0.5.0' },
      // { spec: '0.6.1', eq: '0.6.1' },
      { spec: 'v0.8.17-rc-1', eq: '0.8.17-rc-1' },
    ] as const)('should match %s versions', async (test) => {
      console.log(JSON.stringify(test));
      const v = await getVersionObject(test.spec, true); //TODO: switch off prerelease when have stable release
      // if (test.gte) expect(semver.gte(v.tag_name, test.gte));
      // if (test.lt) expect(semver.lt(v.tag_name, test.lt));
      if (test.eq) expect(semver.eq(v.tag_name, test.eq));
    });
  });
  describe('valid semver', () => {
    it.each([
      { spec: '0.8.*', valid: false },
      { spec: 'v0.8.17', valid: false },
      { spec: '0.8.17', valid: true },
      { spec: '0.8.17-rc-1', valid: true },
    ] as const)('%s is valid semantic version', async (test) => {
      console.log(JSON.stringify(test));
      const v = semver.valid(test.spec) != null;
      expect(v == test.valid);
    });
  });
});
