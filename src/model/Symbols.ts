import Backbone, { ViewOptions } from 'backbone'

import { closestInstance, wait } from '../utils'
import Symbol, { getSymbolId, cleanup } from './Symbol'
import { Editor, Component, CssRule } from 'grapesjs'

// Editor with the symbols plugin
export type SymbolEditor = Editor & { Symbols: Symbols }

export class Symbols extends Backbone.Collection<Symbol>  {
  //model = Symbol
  public editor: Editor
  public options: any
  public updating: boolean = false

  //initialize(models, {editor, options}) {
  constructor(models: Symbol[], { editor, options, ...opts }: any) {
    super(models, opts)
    this.editor = editor
    this.options = options
    if (!options.headless) {
      this.initEvents()
    }
  }

  initEvents() {
    this.editor.on('component:create', c => this.onAdd(c))
    this.editor.on('component:update:components', (parent, comp) => this.onUpdateChildren(parent, comp))
    this.editor.on('component:update:attributes', c => this.onUpdateAttributes(c))
    this.editor.on('component:update:classes', c => this.onUpdateClasses(c))
    this.editor.on('component:input', c => this.onUpdateContent(c))
    this.editor.on('styleable:change', cssRule => this.onStyleChanged(cssRule))
  }

  /**
   * Update sybols with existing components
   * This is used on load only
   * TODO: Use `storage:end:load`? But this event is fired after the components are loaded
   * TODO: Needs review
   * @private
   */
  updateComponents(components: Component[]) {
    components.forEach(c => this.onAdd(c))
  }

  /**
   * Add a component to a symbol
   * This is useful only when loading new HTML content
   * When loading a new component which is a symbol,
   *   add a ref to the component in its symbol.get('instances')
   * Export this method for unit tests
   * TODO: Needs review
   * @private
   */
  onAdd(c: Component) {
    const symbolId = getSymbolId(c)
    if (symbolId) {
      const symbol = this.get(symbolId)
      if (symbol) {
        if (symbol.isInstance(c)) {
          console.warn('Could not add instance', c, `It is already an instance of symbol with id ${symbolId}`)
        } else {
          // This is probably a duplication of a symbol
          // Or we have just loaded the website
          // Make it an instance
          symbol.addInstance(c)
        }
      } else {
        console.warn('Could not add instance', c, `Could not find the symbol with id ${symbolId} (maybe later?)`)
      }
    }
  }

  /**
   * A component's components() has changed
   */
  async onUpdateChildren(parent: Component, component: Component) {
    if (this.updating) return
    const inst = closestInstance(parent)
    if (inst) {
      const symbolId = getSymbolId(inst)
      const s = this.get(symbolId)
      if (s) {
        // wait for the component's children to be changed
        // I couldn't find an event like `component:update:components:after`
        // TODO: need review
        await wait()
        this.updating = true
        s.applyChildren(inst, parent, component)
        this.updating = false
      } else {
        console.warn('Could not update instance', component, ': could not find the symbol with id', symbolId)
      }
    }
  }

  /**
   * A component's attributes has changed
   */
  onUpdateAttributes(c: Component) {
    if (this.updating) return
    const inst = closestInstance(c)
    if (inst) {
      const symbolId = getSymbolId(inst)
      const s = this.get(symbolId)
      if (s) {
        this.updating = true
        s.applyAttributes(inst, c)
        this.updating = false
      } else {
        console.warn('Could not update instance', c, ': could not find the symbol with id', symbolId)
      }
    }
  }

  /**
   * A component's css classes have changed
   */
  onUpdateClasses(c: Component) {
    if (this.updating) return
    const inst = closestInstance(c)
    if (inst) {
      const symbolId = getSymbolId(inst)
      const s = this.get(symbolId)
      if (s) {
        this.updating = true
        s.applyClasses(inst, c)
        this.updating = false
      } else {
        console.warn('Could not update instance', c, ': could not find the symbol with id', symbolId)
      }
    }
  }

  /**
   * A component's text content has changed
   */
  onUpdateContent(c: Component) {
    if (this.updating) return
    const inst = closestInstance(c)
    if (inst) {
      const symbolId = getSymbolId(inst)
      const s = this.get(symbolId)
      if (s) {
        this.updating = true
        s.applyContent(inst, c)
        this.updating = false
      } else {
        console.warn('Could not update instance', c, ': could not find the symbol with id', symbolId)
      }
    }
  }

  /**
   * A component's style has changed
   * TODO: Needs review: isn't the style supposed to be just an attribute => we should not need to sync it, just attributes?
   */
  onStyleChanged(cssRule: CssRule) {
    if (this.updating) return
    const c = cssRule.getComponent()
    const { style } = cssRule.changed
    if (c && style) {
      const inst = closestInstance(c)
      if (inst) {
        const symbolId = getSymbolId(inst)
        const s = this.get(symbolId)
        if (s) {
          // Keep only changed values
          // TODO: Needs review - isn't cssRule.changed supposed to be only what changed?
          const changed: object = Object.entries(style)
            .filter(([key, value]) => cssRule.previousAttributes().style![key] !== value || !cssRule.previousAttributes().style![key])
            .reduce((result, [key, value]) => {
              return {
                ...result,
                [key]: value,
              }
            }, {} as object)
          // Removed keys
          const removed = Object.keys(cssRule.previousAttributes().style!)
            .filter(key => !style[key])
          if (Object.values(changed).length > 0 || removed.length > 0) {
            this.updating = true
            s.applyStyle(inst, c, changed, removed)
            this.updating = false
          }
        } else {
          console.warn('Could not update instance', c, ': could not find the symbol with id', symbolId)
        }
      }
    }
  }
}

// From https://stackoverflow.com/questions/19673089/how-to-properly-define-backbone-collection-using-typescript
Symbols.prototype.model = Symbol