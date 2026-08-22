import {
  buildPhoneLookupCandidates,
  normalizePhoneNumber,
  syntheticEmailFromPhone,
} from './phone';
import { WORKER_PLACEHOLDER_PASSWORD } from '../team/team.constants';

describe('phone helpers', () => {
  it('normalizes local 0 numbers and +233 to the same canonical form', () => {
    expect(normalizePhoneNumber('0540000000')).toBe('+233540000000');
    expect(normalizePhoneNumber('+233540000000')).toBe('+233540000000');
    expect(normalizePhoneNumber('054 000 0000')).toBe('+233540000000');
  });

  it('builds lookup candidates that include 0 and +233 variants', () => {
    const fromLocal = buildPhoneLookupCandidates('0540000000');
    expect(fromLocal).toContain('0540000000');
    expect(fromLocal).toContain('+233540000000');
    expect(fromLocal).toContain('233540000000');

    const fromIntl = buildPhoneLookupCandidates('+233540000000');
    expect(fromIntl).toContain('+233540000000');
    expect(fromIntl).toContain('0540000000');
  });

  it('uses the shared worker placeholder password', () => {
    expect(WORKER_PLACEHOLDER_PASSWORD).toBe('123456');
    expect(syntheticEmailFromPhone('+233540000000')).toBe(
      'phone.233540000000@users.hatchlog.local',
    );
  });
});
