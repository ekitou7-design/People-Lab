import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/v2/productCopy.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { businessLabel, displayCopy } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('display copy preserves unknown IDs and keeps qualification separate from capacity', () => {
  assert.equal(businessLabel('inspect'), '质量检验');
  assert.equal(businessLabel('custom-operation'), 'custom-operation');
  assert.equal(displayCopy('inspect / pos-quality / inspection / quality-auth'), '质量检验 / 质量检验员 / 检验与记录 / 质量检验资格');
  const note = displayCopy('该员工资格已验证，但当前窗口可用容量为 0，调配会影响原有任务，需主管确认影响');
  assert.match(note, /资格符合要求/);
  assert.match(note, /工时为 0，无法用于补缺口/);
  assert.match(note, /重新计算并确认/);
  assert.equal(displayCopy('未知提示：abc-123'), '未知提示：abc-123');
});
