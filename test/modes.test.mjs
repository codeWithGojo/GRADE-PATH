import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../core.js';

test('mode and secondary results survive backup without changing university grades', () => {
  const source = C.blankState();
  source.mode = 'secondary'; source.schoolClass = 'SS 2'; source.schoolTarget = 80;
  source.semesters = [{id:'u1', name:'First semester', courses:[{code:'CSC101', subject:'Programming', units:3, grade:'A'}]}];
  source.schoolTerms = [{id:'s1', name:'First term', subjects:[{name:'English',score:60},{name:'Mathematics',score:80}]}];
  const restored = C.normalizeState(JSON.parse(JSON.stringify(source)));
  assert.equal(restored.mode,'secondary'); assert.equal(restored.schoolClass,'SS 2');
  assert.equal(C.overall(restored).gpa,5); assert.equal(C.schoolSummary(restored.schoolTerms).average,70);
  assert.equal(restored.schoolTarget,80);
  restored.mode = 'university'; assert.equal(C.schoolSummary(restored.schoolTerms).average,70);
});
test('legacy backups default to university and new values are validated', () => {
  const restored=C.normalizeState({scale:5,semesters:[],mode:'unknown',schoolTarget:-1,schoolClass:'not a class'});
  assert.equal(restored.mode,'university'); assert.deepEqual(restored.schoolTerms,[]);
  assert.equal(restored.schoolClass,'SS 3'); assert.equal(restored.schoolTarget,75);
});
test('term averages include zero marks, decimal marks and changes', () => {
  const terms=[{id:'a',name:'A',subjects:C.schoolSubjects([{name:'Maths',score:0},{name:'English',score:75.5}])},
    {id:'b',name:'B',subjects:C.schoolSubjects([{name:'Maths',score:50},{name:'English',score:90}])}];
  const summary=C.schoolSummary(terms);
  assert.equal(summary.history[0].average,37.75); assert.equal(summary.average,70); assert.equal(summary.change,32.25);
  assert.equal(summary.subjects[0].name,'English'); assert.equal(C.schoolSummary([]).average,null);
});
test('secondary subjects reject duplicates and invalid marks on import', () => {
  assert.deepEqual(C.schoolSubjects([{name:' Maths ',score:0},{name:'maths',score:55},{name:'Bad',score:101},{name:'Empty',score:''},{name:'No',score:NaN},{name:'Negative',score:-1},{name:'English',score:100}]), [{name:'Maths',score:0},{name:'English',score:100}]);
});
