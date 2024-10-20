"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYMBOL_SYNC_ATTRIBUTE = exports.SYMBOL_CHILD_ID_ATTRIBUTE = exports.SYMBOL_ID_ATTRIBUTE = void 0;
exports.getSymbolId = getSymbolId;
exports.cleanup = cleanup;
exports.initModel = initModel;
exports.initSymbolChild = initSymbolChild;
exports.createSymbol = createSymbol;
var backbone_1 = __importDefault(require("backbone"));
var utils_1 = require("../utils");
var underscore_1 = require("underscore");
exports.SYMBOL_ID_ATTRIBUTE = 'symbolId';
exports.SYMBOL_CHILD_ID_ATTRIBUTE = 'symbolChildId';
exports.SYMBOL_SYNC_ATTRIBUTE = 'symbolSync';
/**
 * A Symbol class holds the data about a symbol: label, icon
 * The `model` attribute is a grapesjs Component used to create new instances
 * The `instances` attribute is a Map of grapesjs Components kept in sync with the model
 * The model is kept up to date by calling the apply* methods
 *
 * @member {string} attributes.label
 * @member {string} attributes.icon
 * @member {Component} attributes.model
 * @member {Map.<string, Component>} attributes.instances
 *
 * @class
 */
var Symbol = /** @class */ (function (_super) {
    __extends(Symbol, _super);
    function Symbol() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Default options passed to the constructor
     */
    //defaults: {
    //  label: 'New Symbol',
    //  icon: 'fa-question',
    //},
    /**
     * @param {{ label: ?string, icon: ?string }} attributes
     * @param {Object} model - to be converted to Component and stored in attributes.model
     * Notes:
     * - `attributes.instances` will initially be empty until addInstance is called by the Symbols class (onAdd method)
     * - `attributes.model` may initially be a Component (creation of a Symbol) or JSON data (loaded symbol from storage). It is always converted to a Component in `initialize`
     *
     */
    Symbol.prototype.initialize = function () {
        // Check required attributes
        if (!this.has('model'))
            throw new Error('Could not create Symbol: model is required');
        // Init the required instances on the symbol
        if (!this.has('instances')) {
            this.set('instances', new Map());
        }
        if (this.collection) { // This is false during unit tests
            // Get a ref to grapesjs editor
            var editor = this.collection.editor;
            // `attributes.model` may initially be a Component (creation of a Symbol) or JSON data (loaded symbol from storage). It is always converted to a Component in `initialize`
            // in which case we convert model to a real component
            // TODO: Needs review
            var model = this.get('model');
            if (!model.cid) { // FIXME: should be typeof model = 'string'
                var modelComp = editor.addComponents([model])[0];
                this.set('model', modelComp);
            }
            // Make sure the symbol instances are undoable
            editor.UndoManager.add(this);
        }
    };
    /**
     * Return a shallow copy of the model's attributes for JSON
     * stringification.
     * @return {Object}
     * @private
     */
    Symbol.prototype.toJSON = function (opts) {
        if (opts === void 0) { opts = {}; }
        var obj = backbone_1.default.Model.prototype.toJSON.call(this, opts);
        delete obj.instances;
        return obj;
    };
    /**
     * Get all instances as an Array, except the `excludeOne` one
     * @param callback which receives the instances
     * @param excludeOne - optionally exclude one component
     * @param addOne - optionally add one component, typically pass the symbol's `model` attribute when needed
     * @returns The symbol instances
     * @private
     */
    Symbol.prototype.getAll = function (addOne, excludeOne) {
        if (addOne === void 0) { addOne = null; }
        if (excludeOne === void 0) { excludeOne = null; }
        var values = Array.from(this.get('instances').values());
        return (addOne ? [addOne] : []).concat(excludeOne ? values.filter(function (inst) { return inst.cid != excludeOne.cid; }) : values);
    };
    /**
     * Browse all instances and their children matching the changed component
     * Includes the `model` of this symbol
     * Will not include the provided instance `srcInst` nor `srcChild` as they are the ones which changed
     * @param srcInst - the instance of this symbol containing `child`
     * @param srcChild - the child which has the changes
     */
    Symbol.prototype.browseInstancesAndModel = function (srcInst, srcChildren, cbk) {
        this.getAll(this.get('model'), srcInst)
            .forEach(function (dstInst) {
            var dstChildren = srcChildren
                .map(function (srcChild) {
                // Get a child or the root
                return srcChild.has(exports.SYMBOL_ID_ATTRIBUTE)
                    ? dstInst // this is the root
                    : (0, utils_1.find)(dstInst, srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE)); // this is a child
            });
            cbk(dstChildren, dstInst);
        });
    };
    /**
     * Apply css classes to all instances and their children according to changes of a component
     * Also update the `model` attribute of this symbol
     * @param srcInst - the instance of this symbol containing `child`
     * @param srcChild - the child which has the changes
     */
    Symbol.prototype.applyClasses = function (srcInst, srcChild) {
        var _this = this;
        if (srcInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
            return;
        this.browseInstancesAndModel(srcInst, [srcChild], function (_a, dstInst) {
            var dstChild = _a[0];
            if (dstInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
                return;
            if (dstChild) {
                dstChild.setClass(srcChild.getClasses());
            }
            else {
                console.error("Could not sync classes for symbol ".concat(_this.cid, ": ").concat(srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE), " not found in ").concat(dstInst.cid));
            }
        });
    };
    Symbol.prototype.getIndex = function (parent, symbolChildId) {
        // TODO: Needs review
        return parent.components().toArray()
            .findIndex(function (c) { return c.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE) === symbolChildId; });
    };
    /**
     * Update attributes of all instances and their children according to changes of a component
     * Also update the `model` attribute of this symbol
     * @param srcInst - the instance of this symbol containing `child`
     * @param parent - the element whose children have changed
     * @param srcChild - the child which has the changes
     */
    Symbol.prototype.applyChildren = function (srcInst, parent, srcChild) {
        var _this = this;
        if (srcInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
            return;
        if (!parent)
            throw new Error("Could not sync children for symbol ".concat(this.cid, ": ").concat(srcChild.cid, " has no parent"));
        // Get all instances of this symbol
        var allInst = (0, utils_1.all)(srcInst)
            .filter(function (inst) { return inst.get(exports.SYMBOL_SYNC_ATTRIBUTE) !== false; });
        // Handle the create/update/remove cases
        if (allInst.includes(srcChild)) {
            // The child is in the instance
            var symbolChildId_1 = srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE);
            // Case of a child being duplicated inside the symbol
            var isDuplicate = !!symbolChildId_1 && allInst
                .filter(function (c) { return c.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE) === symbolChildId_1 && c.parent() === parent; }).length > 1;
            if (symbolChildId_1 && !isDuplicate) {
                // Case of a moving child inside the instance
                this.browseInstancesAndModel(srcInst, [srcChild, parent], function (_a, dstInst) {
                    var dstChild = _a[0], dstParent = _a[1];
                    if (dstChild && dstParent) {
                        dstParent.append(dstChild, { at: srcChild.index() });
                    }
                    else {
                        console.error("Could not sync child for symbol ".concat(_this.cid, ": ").concat(srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE), " not found in ").concat(dstInst.cid), { dstChild: dstChild, dstParent: dstParent });
                    }
                });
            }
            else {
                // this is a new child
                (0, utils_1.all)(srcChild)
                    // Force new symbolChildId for `srcChild` and its children (excluding symbols)
                    //   because `c` might be a duplicate of another child
                    //   this happens when we duplicate a component inside a symbol
                    .forEach(function (c) { return initSymbolChild(c, true); });
                this.browseInstancesAndModel(srcInst, [parent], function (_a, dstInst) {
                    var dstParent = _a[0];
                    if (dstParent) {
                        var clone = srcChild.clone();
                        dstParent.append(clone, { at: srcChild.index() });
                    }
                    else {
                        console.error("Could not sync attributes for symbol ".concat(_this.cid, ": ").concat(srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE), " not found in ").concat(dstInst.cid));
                    }
                });
            }
        }
        else {
            // Child is not there anymore
            // Beware: srcChild has no parent nor view anymore
            this.browseInstancesAndModel(srcInst, [srcChild], function (_a, dstInst) {
                var dstChild = _a[0];
                if (dstChild) {
                    dstChild.remove();
                }
                else {
                    console.error("Could not sync attributes for symbol ".concat(_this.cid, ": ").concat(srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE), " not found in ").concat(dstInst.cid));
                }
            });
            // this child is not part of a symbol anymore
            srcChild.set(exports.SYMBOL_CHILD_ID_ATTRIBUTE);
        }
    };
    /**
     * Update attributes of all instances and their children according to changes of a component
     * Also update the `model` attribute of this symbol
     * @param srcInst - the instance of this symbol containing `child`
     * @param srcChild - the child which has the changes
     */
    Symbol.prototype.applyAttributes = function (srcInst, srcChild) {
        var _this = this;
        if (srcInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
            return;
        this.browseInstancesAndModel(srcInst, [srcChild], function (_a, dstInst) {
            var dstChild = _a[0];
            if (dstInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
                return;
            if (dstChild) {
                // doesnt work: dstChild.setAttributes(srcChild.getAttributes())
                dstChild.attributes = srcChild.attributes;
            }
            else {
                console.error("Could not sync attributes for symbol ".concat(_this.cid, ": ").concat(srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE), " not found in ").concat(dstInst.cid));
            }
        });
    };
    /**
     * Update text content of all instances and their children according to changes of a component
     * Also update the `model` attribute of this symbol
     * Will not update the provided instance `inst` as it is the one which changed
     * @param srcInst - the instance of this symbol containing `child`
     * @param srcChild - the child which has the changes
     */
    Symbol.prototype.applyContent = function (srcInst, srcChild) {
        var _this = this;
        if (srcInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
            return;
        // Store the caret position in the contenteditable container
        var el = srcChild.getCurrentView().el;
        var caret = (0, utils_1.getCaret)(el);
        this.browseInstancesAndModel(srcInst, [srcChild], function (_a, dstInst) {
            var dstChild = _a[0];
            if (dstInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
                return;
            if (dstChild) {
                if (dstChild.get('type') === 'text') { // FIXME: sometimes type is ""
                    // Sets the new content
                    dstChild.components(srcChild.getCurrentView().el.innerHTML);
                }
                else {
                    console.error('applyContent, NOT A TEXT', dstChild, dstChild.get('type'));
                }
            }
            else {
                console.error("Could not sync content for symbol ".concat(_this.cid, ": ").concat(srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE), " not found in ").concat(dstInst.cid));
            }
        });
        // Restore the caret position in the contenteditable container
        // TODO: need review
        // FIXME: Why is the caret reset after we change the components which do not have the focus?
        setTimeout(function () {
            // After dom update
            (0, utils_1.setCaret)(el, caret);
        });
    };
    /**
     * Update styles of all instances and their children according to changes of a component
     * Also update the `model` attribute of this symbol
     * Will not update the provided instance `inst` as it is the one which changed
     * @param srcInst - the instance of this symbol containing `child`
     * @param srcChild - the child which has the changes
     * @param changed - the changed styles
     * @param removed - the removed styles
     */
    Symbol.prototype.applyStyle = function (srcInst, srcChild, changed, removed) {
        var _this = this;
        if (srcInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
            return;
        this.browseInstancesAndModel(srcInst, [srcChild], function (_a, dstInst) {
            var dstChild = _a[0];
            if (dstInst.get(exports.SYMBOL_SYNC_ATTRIBUTE) === false)
                return;
            if (dstChild) {
                dstChild.setStyle(__assign(__assign({}, dstChild.getStyle()), changed));
                removed.forEach(function (styleName) { return dstChild.removeStyle(styleName); });
            }
            else {
                console.error("Could not sync content for symbol ".concat(_this.cid, ": ").concat(srcChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE), " not found in ").concat(dstInst.cid));
            }
        });
    };
    /**
     * Add a component to this symbol `instances`
     * Called at init when editor triggers a 'components:add' event
     * @param c
     */
    Symbol.prototype.addInstance = function (c) {
        this.get('instances').set(c.cid, c); // here we use cid as `instances` is built and not saved
    };
    /**
     * @return {Component} The created instance, ready to be added to a component
     */
    Symbol.prototype.createInstance = function () {
        // Clone the model
        var inst = this.get('model').clone();
        // Add the component to the symbol instances
        this.addInstance(inst);
        // Let the caller add it to a component
        return inst;
    };
    /**
     * @param c - a component
     * @return {Boolean} true if the component is a symbol
     */
    Symbol.prototype.isInstance = function (c) {
        return !!c.get(exports.SYMBOL_ID_ATTRIBUTE)
            && this.get('instances').has(c.cid);
    };
    /**
     * unlink all instances of a symbol
     */
    Symbol.prototype.unlinkAll = function () {
        var _this = this;
        this.get('instances').forEach(function (c) { return _this.unlink(c); });
    };
    /**
     * unlink an instance from a symbol
     * - remove the symbol ID from the attributes
     * - remove `symbolChildId` from all the children until they are symbols
     * - remove the reference in instances
     */
    Symbol.prototype.unlink = function (c) {
        c.set(exports.SYMBOL_ID_ATTRIBUTE);
        this.get('instances').delete(c.cid);
        (0, utils_1.children)(c)
            .forEach(function (child) { return child.set(exports.SYMBOL_CHILD_ID_ATTRIBUTE); });
    };
    return Symbol;
}(backbone_1.default.Model));
/**
 * @param c - a component, supposedly an instance of a symbol
 * @return the symbol ID if the component is a symbol
 */
function getSymbolId(c) {
    return c.get(exports.SYMBOL_ID_ATTRIBUTE);
}
/**
 * remove symbols IDs from an instance
 */
function cleanup(c) {
    c.set(exports.SYMBOL_ID_ATTRIBUTE);
    c.set(exports.SYMBOL_CHILD_ID_ATTRIBUTE);
}
/**
 * Init a component to be this symbol's `model`
 * Also init the component's children
 * @param {Component} c
 */
function initModel(c, _a) {
    var icon = _a.icon, label = _a.label, symbolId = _a.symbolId;
    // check that it is not part of a Symbol already
    if (c.has(exports.SYMBOL_ID_ATTRIBUTE)) {
        throw new Error('Could not init Symbol model: the model has already been init');
    }
    // This is the symbol cid
    c.set(exports.SYMBOL_ID_ATTRIBUTE, symbolId);
    // add symbol data
    c.set('icon', "<span class=\"fa ".concat(icon, "\"></span>"));
    // Show that this is a symbol, add an icon to the toolbar UI
    var toolbar = c.get('toolbar');
    // FIXME: somehow this happens twice => we should not have to do this check
    if (!toolbar.find(function (t) { return !!t.isSymbol; })) {
        toolbar.push({
            attributes: {
                class: 'fa fa-ban on fa-diamond',
                title: label,
            },
            command: 'do:nothing',
            isSymbol: true, // prevent add 2 buttons
        });
    }
    // init children
    (0, utils_1.children)(c)
        .forEach(function (child) { return initSymbolChild(child); });
}
/**
 * Init a component to be this symbol's `model`'s child
 * @param {Component} c
 */
function initSymbolChild(c, force) {
    if (force === void 0) { force = false; }
    if (force || !c.has(exports.SYMBOL_CHILD_ID_ATTRIBUTE)) {
        c.set(exports.SYMBOL_CHILD_ID_ATTRIBUTE, c.cid);
    }
}
/**
 * create a new symbol ou of a component
 * the component and its children will be init
 * the component will be cloned and stored as the model
 * @return {Symbol}
 */
function createSymbol(editor, c, attributes) {
    var _a;
    var symbolId = (_a = attributes.symbolId) !== null && _a !== void 0 ? _a : "s_".concat((0, underscore_1.uniqueId)(), "_").concat(new Date().getTime());
    // If the component is in a symbol, we need to update all instances
    var inst = (0, utils_1.closestInstance)(c);
    // Init component with symbolId and children
    initModel(c, __assign(__assign({}, attributes), { symbolId: symbolId }));
    // Create a Symbol
    var s = new Symbol(__assign(__assign({}, attributes), { id: symbolId, 
        // Clone the component, store a model
        model: c.clone() }));
    // Store a ref
    s.addInstance(c);
    // Handle the case where the new symbol is a child of another symbol
    if (inst) {
        // For all instances containing c, make c an instance of the new symbolId
        var parentSymbolId = getSymbolId(inst);
        var parentSymbol_1 = editor.Symbols.get(parentSymbolId);
        // For each child of the new symbol
        (0, utils_1.all)(c)
            // For each instance of the parent symbol (containing a soon to be instance of s)
            .forEach(function (child) {
            // Here child is a component of the new symbol
            parentSymbol_1.getAll(null, inst)
                .forEach(function (otherInst) {
                var _a;
                // For each instance of s and its children
                var otherChild = (0, utils_1.find)(otherInst, child.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE));
                console.log('otherChild', (_a = otherChild === null || otherChild === void 0 ? void 0 : otherChild.view) === null || _a === void 0 ? void 0 : _a.el, otherChild === null || otherChild === void 0 ? void 0 : otherChild.get(exports.SYMBOL_ID_ATTRIBUTE), otherChild === null || otherChild === void 0 ? void 0 : otherChild.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE));
                otherChild === null || otherChild === void 0 ? void 0 : otherChild.set(exports.SYMBOL_ID_ATTRIBUTE, symbolId);
                otherChild === null || otherChild === void 0 ? void 0 : otherChild.set(exports.SYMBOL_CHILD_ID_ATTRIBUTE, child.get(exports.SYMBOL_CHILD_ID_ATTRIBUTE));
                // Add the new instance to the symbol
                if (child === c) {
                    s.addInstance(otherChild);
                }
            });
        });
    }
    return s;
}
exports.default = Symbol;
