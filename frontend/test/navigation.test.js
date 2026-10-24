import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkspaceView, workspaceViewUrl } from '../src/components/workspace/navigation.js';

test('direct activity and reference links resolve, while unknown fragments fall back', () => {
  assert.equal(parseWorkspaceView('#activity'), 'activity');
  assert.equal(parseWorkspaceView('#guide'), 'guide');
  assert.equal(parseWorkspaceView('#unknown'), 'authentication');
  assert.equal(parseWorkspaceView(), 'authentication');
});
test('workspace links preserve the active authentication route', () => {
  assert.equal(workspaceViewUrl('/verify', 'guide'), '/verify#guide');
  assert.equal(workspaceViewUrl('/register', 'activity'), '/register#activity');
  assert.equal(workspaceViewUrl('/login', 'authentication'), '/login');
  assert.equal(workspaceViewUrl('/unknown', 'guide'), '/login#guide');
});
