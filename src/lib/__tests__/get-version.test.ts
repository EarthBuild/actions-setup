import * as semver from 'semver';
import { getVersionObject, invariant } from '../get-version';

// The latest version since this test was last changed
// Feel free to update it if Earthbuild has been updated
const latest = '0.8.17';

describe('get-version', () => {
  describe('latest range versions', () => {
    it.each(['latest', '*', '^0', '0.*.*', '0.8.*'] as const)(
      'should match %s versions',
      async (ver) => {
        const v = await getVersionObject(ver, false);
        expect(semver.gte(v.tag_name, latest)).toBe(true);
      },
    );
  });
  describe('range versions', () => {
    it.each([
      { spec: '0.8.*', gte: '0.8.0', lt: '0.9.0' },
      { spec: 'v0.8.*', gte: '0.8.0', lt: '0.9.0' },
      { spec: '0.8.17', eq: '0.8.17' },
      { spec: 'v0.8.17', eq: '0.8.17' },
    ] as const)('should match %s versions', async (test) => {
      const v = await getVersionObject(test.spec, false);
      if (test.gte) expect(semver.gte(v.tag_name, test.gte)).toBe(true);
      if (test.lt) expect(semver.lt(v.tag_name, test.lt)).toBe(true);
      if (test.eq) expect(semver.eq(v.tag_name, test.eq)).toBe(true);
    });
  });
  describe('valid semver', () => {
    it.each([
      { spec: '0.8.*', valid: false },
      { spec: 'v0.8.17', valid: true },
      { spec: '0.8.17', valid: true },
    ] as const)('%s is valid semantic version', (test) => {
      const v = semver.valid(test.spec) != null;
      expect(v).toBe(test.valid);
    });
  });
  describe('error handling & invariants', () => {
    it('should throw an error when no version satisfies the range', async () => {
      await expect(getVersionObject('999.0.0', false)).rejects.toThrow(
        'Could not find a version that satisfied the version range',
      );
    });

    it('invariant utility should assert condition', () => {
      expect(() => invariant(false, 'failed condition')).toThrow(
        'failed condition',
      );
      expect(() => invariant(true, 'should not throw')).not.toThrow();
    });
  });
});

