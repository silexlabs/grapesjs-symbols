/**
 * set editor as dirty
 */
export function setDirty(editor) {
  try {
    const curr = editor.getDirtyCount() || 0
    editor.getModel().set('changesCount', curr + 1)
  } catch(e) {
    // this occures in headless mode and UT
  }
}

/**
 * browse all pages and retrieve all website components
 */
export function getAllComponentsFromEditor(editor) {
  const res = []
  editor.Pages.getAll()
    .forEach(page => {
      page.getMainComponent()
        .onAll(c => res.push(c))
    })
  return res
}

/**
 * Get all the children excluding symbols children
 * @param {Component} c - the root component
 * @returns {(Component|null)} the root component's children
 */
export function children(c) {
  const children = c.components().toArray()
  return children
    .flatMap(child => all(child))
}

/**
 * Get an array of the component + its children excluding symbols children
 * @param {Component} c - the root component
 * @returns {(Component|null)} the root component itself and its children
 */
export function all(c) {
  const children = c.components().toArray()
  return [c]
    .concat(children
      .flatMap(child => {
        if(hasSymbolId(child)) return [child]
        return all(child)
      })
    )
}

/**
 * Find a component in a component's children, with a given symbolChildId or symbolId
 * @param {Component} c - the root component
 * @param {string} cid - the ID we are looking for
 * @returns {(Component|null)} the component itself or one of its children
 */
export function find(c, symbolChildId) {
  if(c.get('symbolChildId') === symbolChildId) {
    return c
  } else {
    // check the children components
    let found = null
    c.components()
      // Does not work properly, why? .find(comp => find(comp, symbolChildId))
      .forEach(comp => {
        if(!found) found = find(comp, symbolChildId)
      })
    return found
  }
}

/**
 * find the first symbol in the parents (or the element itself)
 * exported for unit tests
 * @private
 */
export function closestInstance(c) {
  let ptr = c
  while(ptr && !hasSymbolId(ptr)) {
    ptr = ptr.parent()
  }
  return ptr
}

/**
 * @param {Component} c - a component
 * @return {Boolean} true if the component has a symbol id
 */
export function hasSymbolId(c) {
  return !!c.get('symbolId')
}

export async function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
