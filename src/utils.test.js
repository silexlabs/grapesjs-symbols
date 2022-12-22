import { find, closestInstance } from './utils.js'
import { getTestSymbols } from './test-utils.js'

test('Test find', () =>{
  const { comp1, child11, child111, s1 } = getTestSymbols()
  // all children have symbolChildId set
  expect(find(comp1, null)).toBeNull()
  // unknown symbolChildId
  expect(find(comp1, 'unknown')).toBeNull()
  // find one child
  expect(find(comp1, child11.get('symbolChildId'))).toBe(child11)
  // find one child of a child
  expect(find(comp1, child111.get('symbolChildId'))).not.toBeNull()
  const found = find(comp1, child111.get('symbolChildId'))
  expect(found.cid).toBe(child111.cid)
  // This makes jest crash: expect(find(comp1, child111.get('symbolChildId'))).toBe(child111)
})

test('Test closestInstance', () =>{
  const { comp1, child11 } = getTestSymbols()
  expect(closestInstance(null)).toBeNull()
  expect(closestInstance(comp1)).toBe(comp1)
  expect(closestInstance(child11)).toBe(comp1)
})

