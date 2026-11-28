import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placementReportRows, type ReportAttempt } from './reportRows';

const attempt = (id: string, user_id: string | null, percent: ReportAttempt['percent'], status = 'finished'): ReportAttempt => ({
  id, user_id, percent, status, first_name: '  aLI ', last_name: 'aLIYEV', class_name: ' 9 a ',
});

test('raw export preserves attempts and counts account identities separately', () => {
  const rows = [attempt('a', 'account-1', 40), attempt('b', 'account-1', 75), attempt('c', 'account-2', 20), attempt('d', null, 90)];
  const report = placementReportRows(rows, false);
  assert.deepEqual(report.map(({ id, student_attempts }) => [id, student_attempts]), [['a', 2], ['b', 2], ['c', 1], ['d', 1]]);
  assert.equal(report[0].first_name, rows[0].first_name);
  assert.equal(report[0].class_name, rows[0].class_name);
});

test('summary selects the best scored attempt by account and keeps guests and ungraded rows for review', () => {
  const rows = [
    attempt('older', 'account-1', '75'), attempt('best', 'account-1', '90', 'expired'),
    attempt('tie', 'account-1', 90), attempt('blocked', 'account-1', null, 'blocked'),
    attempt('namesake', 'account-2', 20), attempt('guest-1', null, 70), attempt('guest-2', null, 80),
  ];
  const report = placementReportRows(rows, true);
  assert.deepEqual(report.map(row => row.id), ['best', 'blocked', 'namesake', 'guest-1', 'guest-2']);
  assert.deepEqual(report.slice(0, 1).map(row => [row.first_name, row.last_name, row.class_name, row.student_attempts]), [['Ali', 'Aliyev', '9-A', 4]]);
  assert.match(report[1].review, /ball yo‘q/);
  assert.match(report[2].review, /o‘xshash/);
  assert.match(report[3].review, /Hisob tasdiqlanmagan/);
});
