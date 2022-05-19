import Backbone from 'backbone'
import Symbols, { onAdd } from './Symbols.js'

const comp1 = {
  tagName: 'div',
  content: 'comp1 S1',
  symbolId: 'S1',
}

const comp2 = {
  tagName: 'div',
  content: 'comp2 S1',
  symbolId: 'S1',
}

const s1 = {
  id: 'S1',
  icon: 'fa-cog',
  label: 'S1',
  components: [comp1, comp2],
}

const s2 = {}

describe('Make sure everything has the correct data type and default values', () => {
  let editor
  beforeEach(() => {
    editor = { on: () => {}}
  })

  test('Initialize symbols with test data', () => {
    const symbols = new Symbols([s1], { options: {}, editor})
    expect(symbols).toHaveLength(1)
    expect(symbols.get(s1.id).get('label')).toBe(s1.label)
    expect(symbols.get(s1.id).get('components')).not.toBeUndefined()
    expect(symbols.get(s1.id).get('components') instanceof Backbone.Collection).toBe(true)
  })

  test('Initialize symbols with default values', () => {
    const symbols = new Symbols([s1], { options: {}, editor})
    const s2Inst = symbols.add(s2)
    const id = s2Inst.get('id')
    expect(symbols).toHaveLength(2)
    expect(id).not.toBeUndefined()
    expect(symbols.get(id)).not.toBeUndefined()
    expect(symbols.get(id).get('label')).not.toBeUndefined()
    expect(symbols.get(id).get('components')).not.toBeUndefined()
    expect(symbols.get(id).get('components') instanceof Backbone.Collection).toBe(true)
  })

  test('Add an instance of a symbol', () => {
    const symbols = new Symbols([s1, s2], { options: {}, editor})
    const symbol = symbols.get(s1.id)
    expect(symbol.getComponents()).not.toBeNull()
    expect(symbol.getComponents() instanceof Backbone.Collection).toBe(true)
    expect(symbol.getComponents()).toHaveLength(s1.components.length)
  })
})

describe('Test event listeners which maintain the components list up to date', () => {
  let editor
  beforeEach(() => {
    editor = { 
      on: () => {},
    }
    editor.Symbols = new Symbols([s1, s2], { options: {}, editor})
  })

  test('onAdd method', () => {
    const comp = {
      tagName: 'div',
      content: 'comp S1',
      symbolId: 'S1',
    }

    const components = editor.Symbols.get(s1.id).getComponents()
    expect(components).toHaveLength(2)
    const c = new Backbone.Model(comp)
    const added = onAdd(editor, c)
    expect(added.cid).not.toBe(c.cid)
    expect(added.attributes).toEqual(c.attributes)
    expect(components).toHaveLength(3)
  })
})

