(function () {
'use strict';

(function (scope) {

  'use strict';

  var workingDefaultPrevented = function () {
    var e = document.createEvent('Event');
    e.initEvent('foo', true, true);
    e.preventDefault();
    return e.defaultPrevented;
  }();

  if (!workingDefaultPrevented) {
    var origPreventDefault = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function () {
      if (!this.cancelable) {
        return;
      }

      origPreventDefault.call(this);

      Object.defineProperty(this, 'defaultPrevented', {
        get: function get() {
          return true;
        },
        configurable: true
      });
    };
  }

  var isIE = /Trident/.test(navigator.userAgent);

  if (!window.CustomEvent || isIE && typeof window.CustomEvent !== 'function') {
    window.CustomEvent = function (inType, params) {
      params = params || {};
      var e = document.createEvent('CustomEvent');
      e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
      return e;
    };
    window.CustomEvent.prototype = window.Event.prototype;
  }

  if (!window.Event || isIE && typeof window.Event !== 'function') {
    var origEvent = window.Event;
    window.Event = function (inType, params) {
      params = params || {};
      var e = document.createEvent('Event');
      e.initEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable));
      return e;
    };
    if (origEvent) {
      for (var i in origEvent) {
        window.Event[i] = origEvent[i];
      }
    }
    window.Event.prototype = origEvent.prototype;
  }

  if (!window.MouseEvent || isIE && typeof window.MouseEvent !== 'function') {
    var origMouseEvent = window.MouseEvent;
    window.MouseEvent = function (inType, params) {
      params = params || {};
      var e = document.createEvent('MouseEvent');
      e.initMouseEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.view || window, params.detail, params.screenX, params.screenY, params.clientX, params.clientY, params.ctrlKey, params.altKey, params.shiftKey, params.metaKey, params.button, params.relatedTarget);
      return e;
    };
    if (origMouseEvent) {
      for (var i in origMouseEvent) {
        window.MouseEvent[i] = origMouseEvent[i];
      }
    }
    window.MouseEvent.prototype = origMouseEvent.prototype;
  }

  if (!Array.from) {
    Array.from = function (object) {
      return [].slice.call(object);
    };
  }

  if (!Object.assign) {
    var assign = function assign(target, source) {
      var n$ = Object.getOwnPropertyNames(source);
      for (var i = 0, p; i < n$.length; i++) {
        p = n$[i];
        target[p] = source[p];
      }
    };

    Object.assign = function (target, sources) {
      var args = [].slice.call(arguments, 1);
      for (var i = 0, s; i < args.length; i++) {
        s = args[i];
        if (s) {
          assign(target, s);
        }
      }
      return target;
    };
  }
})(window.WebComponents);

(function () {
  'use strict';

  var needsTemplate = typeof HTMLTemplateElement === 'undefined';
  var brokenDocFragment = !(document.createDocumentFragment().cloneNode() instanceof DocumentFragment);
  var needsDocFrag = false;

  if (/Trident/.test(navigator.userAgent)) {
    (function () {

      needsDocFrag = true;

      var origCloneNode = Node.prototype.cloneNode;
      Node.prototype.cloneNode = function cloneNode(deep) {
        var newDom = origCloneNode.call(this, deep);
        if (this instanceof DocumentFragment) {
          newDom.__proto__ = DocumentFragment.prototype;
        }
        return newDom;
      };

      DocumentFragment.prototype.querySelectorAll = HTMLElement.prototype.querySelectorAll;
      DocumentFragment.prototype.querySelector = HTMLElement.prototype.querySelector;

      Object.defineProperties(DocumentFragment.prototype, {
        'nodeType': {
          get: function get() {
            return Node.DOCUMENT_FRAGMENT_NODE;
          },
          configurable: true
        },

        'localName': {
          get: function get() {
            return undefined;
          },
          configurable: true
        },

        'nodeName': {
          get: function get() {
            return '#document-fragment';
          },
          configurable: true
        }
      });

      var origInsertBefore = Node.prototype.insertBefore;
      function insertBefore(newNode, refNode) {
        if (newNode instanceof DocumentFragment) {
          var child;
          while (child = newNode.firstChild) {
            origInsertBefore.call(this, child, refNode);
          }
        } else {
          origInsertBefore.call(this, newNode, refNode);
        }
        return newNode;
      }
      Node.prototype.insertBefore = insertBefore;

      var origAppendChild = Node.prototype.appendChild;
      Node.prototype.appendChild = function appendChild(child) {
        if (child instanceof DocumentFragment) {
          insertBefore.call(this, child, null);
        } else {
          origAppendChild.call(this, child);
        }
        return child;
      };

      var origRemoveChild = Node.prototype.removeChild;
      var origReplaceChild = Node.prototype.replaceChild;
      Node.prototype.replaceChild = function replaceChild(newChild, oldChild) {
        if (newChild instanceof DocumentFragment) {
          insertBefore.call(this, newChild, oldChild);
          origRemoveChild.call(this, oldChild);
        } else {
          origReplaceChild.call(this, newChild, oldChild);
        }
        return oldChild;
      };

      Document.prototype.createDocumentFragment = function createDocumentFragment() {
        var frag = this.createElement('df');
        frag.__proto__ = DocumentFragment.prototype;
        return frag;
      };

      var origImportNode = Document.prototype.importNode;
      Document.prototype.importNode = function importNode(impNode, deep) {
        deep = deep || false;
        var newNode = origImportNode.call(this, impNode, deep);
        if (impNode instanceof DocumentFragment) {
          newNode.__proto__ = DocumentFragment.prototype;
        }
        return newNode;
      };
    })();
  }

  var capturedCloneNode = Node.prototype.cloneNode;
  var capturedCreateElement = Document.prototype.createElement;
  var capturedImportNode = Document.prototype.importNode;
  var capturedRemoveChild = Node.prototype.removeChild;
  var capturedAppendChild = Node.prototype.appendChild;
  var capturedReplaceChild = Node.prototype.replaceChild;

  var elementQuerySelectorAll = Element.prototype.querySelectorAll;
  var docQuerySelectorAll = Document.prototype.querySelectorAll;
  var fragQuerySelectorAll = DocumentFragment.prototype.querySelectorAll;

  var scriptSelector = 'script:not([type]),script[type="application/javascript"],script[type="text/javascript"]';

  function QSA(node, selector) {
    if (!node.childNodes.length) {
      return [];
    }
    switch (node.nodeType) {
      case Node.DOCUMENT_NODE:
        return docQuerySelectorAll.call(node, selector);
      case Node.DOCUMENT_FRAGMENT_NODE:
        return fragQuerySelectorAll.call(node, selector);
      default:
        return elementQuerySelectorAll.call(node, selector);
    }
  }

  var needsCloning = function () {
    if (!needsTemplate) {
      var t = document.createElement('template');
      var t2 = document.createElement('template');
      t2.content.appendChild(document.createElement('div'));
      t.content.appendChild(t2);
      var clone = t.cloneNode(true);
      return clone.content.childNodes.length === 0 || clone.content.firstChild.content.childNodes.length === 0 || brokenDocFragment;
    }
  }();

  var TEMPLATE_TAG = 'template';
  var PolyfilledHTMLTemplateElement = function PolyfilledHTMLTemplateElement() {};

  if (needsTemplate) {

    var contentDoc = document.implementation.createHTMLDocument('template');
    var canDecorate = true;

    var templateStyle = document.createElement('style');
    templateStyle.textContent = TEMPLATE_TAG + '{display:none;}';

    var head = document.head;
    head.insertBefore(templateStyle, head.firstElementChild);

    PolyfilledHTMLTemplateElement.prototype = Object.create(HTMLElement.prototype);

    var canProtoPatch = !document.createElement('div').hasOwnProperty('innerHTML');

    PolyfilledHTMLTemplateElement.decorate = function (template) {
      if (template.content) {
        return;
      }
      template.content = contentDoc.createDocumentFragment();
      var child;
      while (child = template.firstChild) {
        capturedAppendChild.call(template.content, child);
      }

      if (canProtoPatch) {
        template.__proto__ = PolyfilledHTMLTemplateElement.prototype;
      } else {
        template.cloneNode = function (deep) {
          return PolyfilledHTMLTemplateElement._cloneNode(this, deep);
        };

        if (canDecorate) {
          try {
            defineInnerHTML(template);
            defineOuterHTML(template);
          } catch (err) {
            canDecorate = false;
          }
        }
      }

      PolyfilledHTMLTemplateElement.bootstrap(template.content);
    };

    var defineInnerHTML = function defineInnerHTML(obj) {
      Object.defineProperty(obj, 'innerHTML', {
        get: function get() {
          var o = '';
          for (var e = this.content.firstChild; e; e = e.nextSibling) {
            o += e.outerHTML || escapeData(e.data);
          }
          return o;
        },
        set: function set(text) {
          contentDoc.body.innerHTML = text;
          PolyfilledHTMLTemplateElement.bootstrap(contentDoc);
          while (this.content.firstChild) {
            capturedRemoveChild.call(this.content, this.content.firstChild);
          }
          while (contentDoc.body.firstChild) {
            capturedAppendChild.call(this.content, contentDoc.body.firstChild);
          }
        },
        configurable: true
      });
    };

    var defineOuterHTML = function defineOuterHTML(obj) {
      Object.defineProperty(obj, 'outerHTML', {
        get: function get() {
          return '<' + TEMPLATE_TAG + '>' + this.innerHTML + '</' + TEMPLATE_TAG + '>';
        },
        set: function set(innerHTML) {
          if (this.parentNode) {
            contentDoc.body.innerHTML = innerHTML;
            var docFrag = this.ownerDocument.createDocumentFragment();
            while (contentDoc.body.firstChild) {
              capturedAppendChild.call(docFrag, contentDoc.body.firstChild);
            }
            capturedReplaceChild.call(this.parentNode, docFrag, this);
          } else {
            throw new Error("Failed to set the 'outerHTML' property on 'Element': This element has no parent node.");
          }
        },
        configurable: true
      });
    };

    defineInnerHTML(PolyfilledHTMLTemplateElement.prototype);
    defineOuterHTML(PolyfilledHTMLTemplateElement.prototype);

    PolyfilledHTMLTemplateElement.bootstrap = function bootstrap(doc) {
      var templates = QSA(doc, TEMPLATE_TAG);
      for (var i = 0, l = templates.length, t; i < l && (t = templates[i]); i++) {
        PolyfilledHTMLTemplateElement.decorate(t);
      }
    };

    document.addEventListener('DOMContentLoaded', function () {
      PolyfilledHTMLTemplateElement.bootstrap(document);
    });

    Document.prototype.createElement = function createElement() {
      var el = capturedCreateElement.apply(this, arguments);
      if (el.localName === 'template') {
        PolyfilledHTMLTemplateElement.decorate(el);
      }
      return el;
    };

    var escapeDataRegExp = /[&\u00A0<>]/g;

    var escapeReplace = function escapeReplace(c) {
      switch (c) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '\xA0':
          return '&nbsp;';
      }
    };

    var escapeData = function escapeData(s) {
      return s.replace(escapeDataRegExp, escapeReplace);
    };
  }

  if (needsTemplate || needsCloning) {

    PolyfilledHTMLTemplateElement._cloneNode = function _cloneNode(template, deep) {
      var clone = capturedCloneNode.call(template, false);

      if (this.decorate) {
        this.decorate(clone);
      }
      if (deep) {
        capturedAppendChild.call(clone.content, capturedCloneNode.call(template.content, true));

        fixClonedDom(clone.content, template.content);
      }
      return clone;
    };

    var fixClonedDom = function fixClonedDom(clone, source) {
      if (!source.querySelectorAll) return;

      var s$ = QSA(source, TEMPLATE_TAG);
      if (s$.length === 0) {
        return;
      }
      var t$ = QSA(clone, TEMPLATE_TAG);
      for (var i = 0, l = t$.length, t, s; i < l; i++) {
        s = s$[i];
        t = t$[i];
        if (PolyfilledHTMLTemplateElement && PolyfilledHTMLTemplateElement.decorate) {
          PolyfilledHTMLTemplateElement.decorate(s);
        }
        capturedReplaceChild.call(t.parentNode, cloneNode.call(s, true), t);
      }
    };

    var fixClonedScripts = function fixClonedScripts(fragment) {
      var scripts = QSA(fragment, scriptSelector);
      for (var ns, s, i = 0; i < scripts.length; i++) {
        s = scripts[i];
        ns = capturedCreateElement.call(document, 'script');
        ns.textContent = s.textContent;
        var attrs = s.attributes;
        for (var ai = 0, a; ai < attrs.length; ai++) {
          a = attrs[ai];
          ns.setAttribute(a.name, a.value);
        }
        capturedReplaceChild.call(s.parentNode, ns, s);
      }
    };

    var cloneNode = Node.prototype.cloneNode = function cloneNode(deep) {
      var dom;

      if (!needsDocFrag && brokenDocFragment && this instanceof DocumentFragment) {
        if (!deep) {
          return this.ownerDocument.createDocumentFragment();
        } else {
          dom = importNode.call(this.ownerDocument, this, true);
        }
      } else if (this.nodeType === Node.ELEMENT_NODE && this.localName === TEMPLATE_TAG) {
        dom = PolyfilledHTMLTemplateElement._cloneNode(this, deep);
      } else {
        dom = capturedCloneNode.call(this, deep);
      }

      if (deep) {
        fixClonedDom(dom, this);
      }
      return dom;
    };

    var importNode = Document.prototype.importNode = function importNode(element, deep) {
      deep = deep || false;
      if (element.localName === TEMPLATE_TAG) {
        return PolyfilledHTMLTemplateElement._cloneNode(element, deep);
      } else {
        var dom = capturedImportNode.call(this, element, deep);
        if (deep) {
          fixClonedDom(dom, element);
          fixClonedScripts(dom);
        }
        return dom;
      }
    };
  }

  if (needsTemplate) {
    window.HTMLTemplateElement = PolyfilledHTMLTemplateElement;
  }
})();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function objectOrFunction(x) {
  var type = typeof x === 'undefined' ? 'undefined' : _typeof(x);
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function _isArray(x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

function useNextTick() {
  return function () {
    return process.nextTick(flush);
  };
}

function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = require;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;

if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

var _typeof$1 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function resolve$1(object) {
  var Constructor = this;

  if (object && (typeof object === 'undefined' ? 'undefined' : _typeof$1(object)) === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === GET_THEN_ERROR) {
      reject(promise, GET_THEN_ERROR.error);
      GET_THEN_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {} else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function Enumerator$1(Constructor, input) {
  this._instanceConstructor = Constructor;
  this.promise = new Constructor(noop);

  if (!this.promise[PROMISE_ID]) {
    makePromise(this.promise);
  }

  if (isArray(input)) {
    this.length = input.length;
    this._remaining = input.length;

    this._result = new Array(this.length);

    if (this.length === 0) {
      fulfill(this.promise, this._result);
    } else {
      this.length = this.length || 0;
      this._enumerate(input);
      if (this._remaining === 0) {
        fulfill(this.promise, this._result);
      }
    }
  } else {
    reject(this.promise, validationError());
  }
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

Enumerator$1.prototype._enumerate = function (input) {
  for (var i = 0; this._state === PENDING && i < input.length; i++) {
    this._eachEntry(input[i], i);
  }
};

Enumerator$1.prototype._eachEntry = function (entry, i) {
  var c = this._instanceConstructor;
  var resolve$$1 = c.resolve;


  if (resolve$$1 === resolve$1) {
    var _then = getThen(entry);

    if (_then === then && entry._state !== PENDING) {
      this._settledAt(entry._state, i, entry._result);
    } else if (typeof _then !== 'function') {
      this._remaining--;
      this._result[i] = entry;
    } else if (c === Promise$1) {
      var promise = new c(noop);
      handleMaybeThenable(promise, entry, _then);
      this._willSettleAt(promise, i);
    } else {
      this._willSettleAt(new c(function (resolve$$1) {
        return resolve$$1(entry);
      }), i);
    }
  } else {
    this._willSettleAt(resolve$$1(entry), i);
  }
};

Enumerator$1.prototype._settledAt = function (state, i, value) {
  var promise = this.promise;


  if (promise._state === PENDING) {
    this._remaining--;

    if (state === REJECTED) {
      reject(promise, value);
    } else {
      this._result[i] = value;
    }
  }

  if (this._remaining === 0) {
    fulfill(promise, this._result);
  }
};

Enumerator$1.prototype._willSettleAt = function (promise, i) {
  var enumerator = this;

  subscribe(promise, undefined, function (value) {
    return enumerator._settledAt(FULFILLED, i, value);
  }, function (reason) {
    return enumerator._settledAt(REJECTED, i, reason);
  });
};

function all(entries) {
  return new Enumerator$1(this, entries).promise;
}

function race(entries) {
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

function reject$1(reason) {
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

function Promise$1(resolver) {
  this[PROMISE_ID] = nextId();
  this._result = this._state = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    typeof resolver !== 'function' && needsResolver();
    this instanceof Promise$1 ? initializePromise(this, resolver) : needsNew();
  }
}

Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

Promise$1.prototype = {
  constructor: Promise$1,

  then: then,

  catch: function _catch(onRejection) {
    return this.then(null, onRejection);
  }
};

if (!window.Promise) {
  window.Promise = Promise$1;

  Promise$1.prototype['catch'] = Promise$1.prototype.catch;
  Promise$1.prototype['then'] = Promise$1.prototype.then;
  Promise$1['all'] = Promise$1.all;
  Promise$1['race'] = Promise$1.race;
  Promise$1['resolve'] = Promise$1.resolve;
  Promise$1['reject'] = Promise$1.reject;
}

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function (scope) {
  var useNative = Boolean('import' in document.createElement('link'));

  var currentScript = null;
  if ('currentScript' in document === false) {
    Object.defineProperty(document, 'currentScript', {
      get: function get() {
        return currentScript || (document.readyState !== 'complete' ? document.scripts[document.scripts.length - 1] : null);
      },

      configurable: true
    });
  }

  var forEach = function forEach(list, callback, inverseOrder) {
    var length = list ? list.length : 0;
    var increment = inverseOrder ? -1 : 1;
    var i = inverseOrder ? length - 1 : 0;
    for (; i < length && i >= 0; i = i + increment) {
      callback(list[i], i);
    }
  };

  var CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
  var CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g;
  var STYLESHEET_REGEXP = /(<link[^>]*)(rel=['|"]?stylesheet['|"]?[^>]*>)/g;

  var Path = {
    fixUrls: function fixUrls(element, base) {
      if (element.href) {
        element.setAttribute('href', Path.resolveUrl(element.getAttribute('href'), base));
      }
      if (element.src) {
        element.setAttribute('src', Path.resolveUrl(element.getAttribute('src'), base));
      }
      if (element.localName === 'style') {
        var r = Path.replaceUrls(element.textContent, base, CSS_URL_REGEXP);
        element.textContent = Path.replaceUrls(r, base, CSS_IMPORT_REGEXP);
      }
    },
    replaceUrls: function replaceUrls(text, linkUrl, regexp) {
      return text.replace(regexp, function (m, pre, url, post) {
        var urlPath = url.replace(/["']/g, '');
        if (linkUrl) {
          urlPath = Path.resolveUrl(urlPath, linkUrl);
        }
        return pre + '\'' + urlPath + '\'' + post;
      });
    },
    resolveUrl: function resolveUrl(url, base) {
      if (Path.__workingURL === undefined) {
        Path.__workingURL = false;
        try {
          var u = new URL('b', 'http://a');
          u.pathname = 'c%20d';
          Path.__workingURL = u.href === 'http://a/c%20d';
        } catch (e) {}
      }

      if (Path.__workingURL) {
        return new URL(url, base).href;
      }

      var doc = Path.__tempDoc;
      if (!doc) {
        doc = document.implementation.createHTMLDocument('temp');
        Path.__tempDoc = doc;
        doc.__base = doc.createElement('base');
        doc.head.appendChild(doc.__base);
        doc.__anchor = doc.createElement('a');
      }
      doc.__base.href = base;
      doc.__anchor.href = url;
      return doc.__anchor.href || url;
    }
  };

  var Xhr = {

    async: true,

    load: function load(url, success, fail) {
      if (!url) {
        fail('error: href must be specified');
      } else if (url.match(/^data:/)) {
        var pieces = url.split(',');
        var header = pieces[0];
        var resource = pieces[1];
        if (header.indexOf(';base64') > -1) {
          resource = atob(resource);
        } else {
          resource = decodeURIComponent(resource);
        }
        success(resource);
      } else {
        var request = new XMLHttpRequest();
        request.open('GET', url, Xhr.async);
        request.onload = function () {
          var redirectedUrl = request.responseURL || request.getResponseHeader('Location');
          if (redirectedUrl && redirectedUrl.indexOf('/') === 0) {
            var origin = location.origin || location.protocol + '//' + location.host;
            redirectedUrl = origin + redirectedUrl;
          }
          var resource = request.response || request.responseText;
          if (request.status === 304 || request.status === 0 || request.status >= 200 && request.status < 300) {
            success(resource, redirectedUrl);
          } else {
            fail(resource);
          }
        };
        request.send();
      }
    }
  };

  var isIE = /Trident/.test(navigator.userAgent) || /Edge\/\d./i.test(navigator.userAgent);

  var importSelector = 'link[rel=import]';

  var importDisableType = 'import-disable';

  var disabledLinkSelector = 'link[rel=stylesheet][href][type=' + importDisableType + ']';

  var scriptsSelector = 'script:not([type]),script[type="application/javascript"],' + 'script[type="text/javascript"]';

  var importDependenciesSelector = importSelector + ',' + disabledLinkSelector + ',' + 'style:not([type]),link[rel=stylesheet][href]:not([type]),' + scriptsSelector;

  var importDependencyAttr = 'import-dependency';

  var rootImportSelector = importSelector + ':not([' + importDependencyAttr + '])';

  var pendingScriptsSelector = 'script[' + importDependencyAttr + ']';

  var pendingStylesSelector = 'style[' + importDependencyAttr + '],' + ('link[rel=stylesheet][' + importDependencyAttr + ']');

  var Importer = function () {
    function Importer() {
      var _this = this;

      _classCallCheck(this, Importer);

      this.documents = {};

      this.inflight = 0;
      this.dynamicImportsMO = new MutationObserver(function (m) {
        return _this.handleMutations(m);
      });

      this.dynamicImportsMO.observe(document.head, {
        childList: true,
        subtree: true
      });

      this.loadImports(document);
    }

    _createClass(Importer, [{
      key: 'loadImports',
      value: function loadImports(doc) {
        var _this2 = this;

        var links = doc.querySelectorAll(importSelector);
        forEach(links, function (link) {
          return _this2.loadImport(link);
        });
      }
    }, {
      key: 'loadImport',
      value: function loadImport(link) {
        var _this3 = this;

        var url = link.href;

        if (this.documents[url] !== undefined) {
          var imp = this.documents[url];
          if (imp && imp['__loaded']) {
            link['__import'] = imp;
            this.fireEventIfNeeded(link);
          }
          return;
        }
        this.inflight++;

        this.documents[url] = 'pending';
        Xhr.load(url, function (resource, redirectedUrl) {
          var doc = _this3.makeDocument(resource, redirectedUrl || url);
          _this3.documents[url] = doc;
          _this3.inflight--;

          _this3.loadImports(doc);
          _this3.processImportsIfLoadingDone();
        }, function () {
          _this3.documents[url] = null;
          _this3.inflight--;
          _this3.processImportsIfLoadingDone();
        });
      }
    }, {
      key: 'makeDocument',
      value: function makeDocument(resource, url) {
        if (!resource) {
          return document.createDocumentFragment();
        }

        if (isIE) {
          resource = resource.replace(STYLESHEET_REGEXP, function (match, p1, p2) {
            if (match.indexOf('type=') === -1) {
              return p1 + ' type=' + importDisableType + ' ' + p2;
            }
            return match;
          });
        }

        var content = void 0;
        var template = document.createElement('template');
        template.innerHTML = resource;
        if (template.content) {
          content = template.content;

          var replaceScripts = function replaceScripts(content) {
            forEach(content.querySelectorAll('template'), function (template) {
              forEach(template.content.querySelectorAll(scriptsSelector), function (script) {
                var clone = document.createElement('script');
                forEach(script.attributes, function (attr) {
                  return clone.setAttribute(attr.name, attr.value);
                });
                clone.textContent = script.textContent;
                script.parentNode.insertBefore(clone, script);
                script.parentNode.removeChild(script);
              });
              replaceScripts(template.content);
            });
          };
          replaceScripts(content);
        } else {
          content = document.createDocumentFragment();
          while (template.firstChild) {
            content.appendChild(template.firstChild);
          }
        }

        var baseEl = content.querySelector('base');
        if (baseEl) {
          url = Path.resolveUrl(baseEl.getAttribute('href'), url);
          baseEl.removeAttribute('href');
        }

        var n$ = content.querySelectorAll(importDependenciesSelector);

        var inlineScriptIndex = 0;
        forEach(n$, function (n) {
          whenElementLoaded(n);
          Path.fixUrls(n, url);

          n.setAttribute(importDependencyAttr, '');

          if (n.localName === 'script' && !n.src && n.textContent) {
            var num = inlineScriptIndex ? '-' + inlineScriptIndex : '';
            var _content = n.textContent + ('\n//# sourceURL=' + url + num + '.js\n');

            n.setAttribute('src', 'data:text/javascript;charset=utf-8,' + encodeURIComponent(_content));
            n.textContent = '';
            inlineScriptIndex++;
          }
        });
        return content;
      }
    }, {
      key: 'processImportsIfLoadingDone',
      value: function processImportsIfLoadingDone() {
        var _this4 = this;

        if (this.inflight) return;

        this.dynamicImportsMO.disconnect();
        this.flatten(document);

        var scriptsOk = false,
            stylesOk = false;
        var onLoadingDone = function onLoadingDone() {
          if (stylesOk && scriptsOk) {
            _this4.loadImports(document);
            if (_this4.inflight) return;

            _this4.dynamicImportsMO.observe(document.head, {
              childList: true,
              subtree: true
            });
            _this4.fireEvents();
          }
        };
        this.waitForStyles(function () {
          stylesOk = true;
          onLoadingDone();
        });
        this.runScripts(function () {
          scriptsOk = true;
          onLoadingDone();
        });
      }
    }, {
      key: 'flatten',
      value: function flatten(doc) {
        var _this5 = this;

        var n$ = doc.querySelectorAll(importSelector);
        forEach(n$, function (n) {
          var imp = _this5.documents[n.href];
          n['__import'] = imp;
          if (imp && imp.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            _this5.documents[n.href] = n;
            n.readyState = 'loading';
            n['__import'] = n;
            _this5.flatten(imp);
            n.appendChild(imp);
          }
        });
      }
    }, {
      key: 'runScripts',
      value: function runScripts(callback) {
        var s$ = document.querySelectorAll(pendingScriptsSelector);
        var l = s$.length;
        var cloneScript = function cloneScript(i) {
          if (i < l) {
            var s = s$[i];
            var clone = document.createElement('script');

            s.removeAttribute(importDependencyAttr);
            forEach(s.attributes, function (attr) {
              return clone.setAttribute(attr.name, attr.value);
            });

            currentScript = clone;
            s.parentNode.replaceChild(clone, s);
            whenElementLoaded(clone, function () {
              currentScript = null;
              cloneScript(i + 1);
            });
          } else {
            callback();
          }
        };
        cloneScript(0);
      }
    }, {
      key: 'waitForStyles',
      value: function waitForStyles(callback) {
        var s$ = document.querySelectorAll(pendingStylesSelector);
        var pending = s$.length;
        if (!pending) {
          callback();
          return;
        }

        var needsMove = isIE && !!document.querySelector(disabledLinkSelector);
        forEach(s$, function (s) {
          whenElementLoaded(s, function () {
            s.removeAttribute(importDependencyAttr);
            if (--pending === 0) {
              callback();
            }
          });

          if (needsMove && s.parentNode !== document.head) {
            var placeholder = document.createElement(s.localName);

            placeholder['__appliedElement'] = s;

            placeholder.setAttribute('type', 'import-placeholder');

            s.parentNode.insertBefore(placeholder, s.nextSibling);
            var newSibling = importForElement(s);
            while (newSibling && importForElement(newSibling)) {
              newSibling = importForElement(newSibling);
            }
            if (newSibling.parentNode !== document.head) {
              newSibling = null;
            }
            document.head.insertBefore(s, newSibling);

            s.removeAttribute('type');
          }
        });
      }
    }, {
      key: 'fireEvents',
      value: function fireEvents() {
        var _this6 = this;

        var n$ = document.querySelectorAll(importSelector);

        forEach(n$, function (n) {
          return _this6.fireEventIfNeeded(n);
        }, true);
      }
    }, {
      key: 'fireEventIfNeeded',
      value: function fireEventIfNeeded(link) {
        if (!link['__loaded']) {
          link['__loaded'] = true;

          link.import && (link.import.readyState = 'complete');
          var eventType = link.import ? 'load' : 'error';
          link.dispatchEvent(newCustomEvent(eventType, {
            bubbles: false,
            cancelable: false,
            detail: undefined
          }));
        }
      }
    }, {
      key: 'handleMutations',
      value: function handleMutations(mutations) {
        var _this7 = this;

        forEach(mutations, function (m) {
          return forEach(m.addedNodes, function (elem) {
            if (elem && elem.nodeType === Node.ELEMENT_NODE) {
              if (isImportLink(elem)) {
                _this7.loadImport(elem);
              } else {
                _this7.loadImports(elem);
              }
            }
          });
        });
      }
    }]);

    return Importer;
  }();

  var isImportLink = function isImportLink(node) {
    return node.nodeType === Node.ELEMENT_NODE && node.localName === 'link' && node.rel === 'import';
  };

  var whenElementLoaded = function whenElementLoaded(element, callback) {
    if (element['__loaded']) {
      callback && callback();
    } else if (element.localName === 'script' && !element.src || element.localName === 'style' && !element.firstChild) {
      element['__loaded'] = true;
      callback && callback();
    } else {
      var onLoadingDone = function onLoadingDone(event) {
        element.removeEventListener(event.type, onLoadingDone);
        element['__loaded'] = true;
        callback && callback();
      };
      element.addEventListener('load', onLoadingDone);

      if (!isIE || element.localName !== 'style') {
        element.addEventListener('error', onLoadingDone);
      }
    }
  };

  var whenReady = function whenReady(callback) {
    whenDocumentReady(function () {
      return whenImportsReady(function () {
        return callback && callback();
      });
    });
  };

  var whenDocumentReady = function whenDocumentReady(callback) {
    var stateChanged = function stateChanged() {
      if (document.readyState !== 'loading' && !!document.body) {
        document.removeEventListener('readystatechange', stateChanged);
        callback();
      }
    };
    document.addEventListener('readystatechange', stateChanged);
    stateChanged();
  };

  var whenImportsReady = function whenImportsReady(callback) {
    var imports = document.querySelectorAll(rootImportSelector);
    var pending = imports.length;
    if (!pending) {
      callback();
      return;
    }
    forEach(imports, function (imp) {
      return whenElementLoaded(imp, function () {
        if (--pending === 0) {
          callback();
        }
      });
    });
  };

  var importForElement = function importForElement(element) {
    if (useNative) {
      return element.ownerDocument !== document ? element.ownerDocument : null;
    }
    var doc = element['__importDoc'];
    if (!doc && element.parentNode) {
      doc = element.parentNode;
      if (typeof doc.closest === 'function') {
        doc = doc.closest(importSelector);
      } else {
        while (!isImportLink(doc) && (doc = doc.parentNode)) {}
      }
      element['__importDoc'] = doc;
    }
    return doc;
  };

  var importer = null;

  var loadImports = function loadImports(doc) {
    if (importer) {
      importer.loadImports(doc);
    }
  };

  var newCustomEvent = function newCustomEvent(type, params) {
    if (typeof window.CustomEvent === 'function') {
      return new CustomEvent(type, params);
    }
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(type, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
    return event;
  };

  if (useNative) {
    var imps = document.querySelectorAll(importSelector);
    forEach(imps, function (imp) {
      if (!imp.import || imp.import.readyState !== 'loading') {
        imp['__loaded'] = true;
      }
    });

    var onLoadingDone = function onLoadingDone(event) {
      var elem = event.target;
      if (isImportLink(elem)) {
        elem['__loaded'] = true;
      }
    };
    document.addEventListener('load', onLoadingDone, true);
    document.addEventListener('error', onLoadingDone, true);
  } else {
    var native_baseURI = Object.getOwnPropertyDescriptor(Node.prototype, 'baseURI');

    var klass = !native_baseURI || native_baseURI.configurable ? Node : Element;
    Object.defineProperty(klass.prototype, 'baseURI', {
      get: function get() {
        var ownerDoc = isImportLink(this) ? this : importForElement(this);
        if (ownerDoc) return ownerDoc.href;

        if (native_baseURI && native_baseURI.get) return native_baseURI.get.call(this);

        var base = document.querySelector('base');
        return (base || window.location).href;
      },

      configurable: true,
      enumerable: true
    });

    Object.defineProperty(HTMLLinkElement.prototype, 'import', {
      get: function get() {
        return this['__import'] || null;
      },

      configurable: true,
      enumerable: true
    });

    whenDocumentReady(function () {
      importer = new Importer();
    });
  }

  whenReady(function () {
    return document.dispatchEvent(newCustomEvent('HTMLImportsLoaded', {
      cancelable: true,
      bubbles: true,
      detail: undefined
    }));
  });

  scope.useNative = useNative;
  scope.whenReady = whenReady;
  scope.importForElement = importForElement;
  scope.loadImports = loadImports;
})(window.HTMLImports = window.HTMLImports || {});

window['WebComponents'] = window['WebComponents'] || { 'flags': {} };

var file = 'webcomponents-lite.js';
var script = document.querySelector('script[src*="' + file + '"]');
var flagMatcher = /wc-(.+)/;

var flags = {};
if (!flags['noOpts']) {
  location.search.slice(1).split('&').forEach(function (option) {
    var parts = option.split('=');
    var match = void 0;
    if (parts[0] && (match = parts[0].match(flagMatcher))) {
      flags[match[1]] = parts[1] || true;
    }
  });

  if (script) {
    for (var i = 0, a; a = script.attributes[i]; i++) {
      if (a.name !== 'src') {
        flags[a.name] = a.value || true;
      }
    }
  }

  if (flags['log'] && flags['log']['split']) {
    var parts = flags['log'].split(',');
    flags['log'] = {};
    parts.forEach(function (f) {
      flags['log'][f] = true;
    });
  } else {
    flags['log'] = {};
  }
}

window['WebComponents']['flags'] = flags;
var forceShady = flags['shadydom'];
if (forceShady) {
  window['ShadyDOM'] = window['ShadyDOM'] || {};
  window['ShadyDOM']['force'] = forceShady;
}

var forceCE = flags['register'] || flags['ce'];
if (forceCE && window['customElements']) {
  window['customElements']['forcePolyfill'] = forceCE;
}

var settings = window['ShadyDOM'] || {};

settings.hasNativeShadowDOM = Boolean(Element.prototype.attachShadow && Node.prototype.getRootNode);

var desc = Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild');

settings.hasDescriptors = Boolean(desc && desc.configurable && desc.get);
settings.inUse = settings['force'] || !settings.hasNativeShadowDOM;

function isTrackingLogicalChildNodes(node) {
  return node.__shady && node.__shady.firstChild !== undefined;
}

function isShadyRoot(obj) {
  return Boolean(obj.__localName === 'ShadyRoot');
}

function ownerShadyRootForNode(node) {
  var root = node.getRootNode();
  if (isShadyRoot(root)) {
    return root;
  }
}

var p = Element.prototype;
var matches = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;

function matchesSelector(element, selector) {
  return matches.call(element, selector);
}

function copyOwnProperty(name, source, target) {
  var pd = Object.getOwnPropertyDescriptor(source, name);
  if (pd) {
    Object.defineProperty(target, name, pd);
  }
}

function extend(target, source) {
  if (target && source) {
    var n$ = Object.getOwnPropertyNames(source);
    for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
      copyOwnProperty(n, source, target);
    }
  }
  return target || source;
}

function extendAll(target) {
  for (var _len = arguments.length, sources = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    sources[_key - 1] = arguments[_key];
  }

  for (var i = 0; i < sources.length; i++) {
    extend(target, sources[i]);
  }
  return target;
}

function mixin(target, source) {
  for (var i in source) {
    target[i] = source[i];
  }
  return target;
}

function patchPrototype(obj, mixin) {
  var proto = Object.getPrototypeOf(obj);
  if (!proto.hasOwnProperty('__patchProto')) {
    var patchProto = Object.create(proto);
    patchProto.__sourceProto = proto;
    extend(patchProto, mixin);
    proto['__patchProto'] = patchProto;
  }

  obj.__proto__ = proto['__patchProto'];
}

var twiddle = document.createTextNode('');
var content = 0;
var queue$1 = [];
new MutationObserver(function () {
  while (queue$1.length) {
    try {
      queue$1.shift()();
    } catch (e) {
      twiddle.textContent = content++;
      throw e;
    }
  }
}).observe(twiddle, { characterData: true });

function microtask(callback) {
  queue$1.push(callback);
  twiddle.textContent = content++;
}

var hasDocumentContains = Boolean(document.contains);

function contains(container, node) {
  while (node) {
    if (node == container) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

var flushList = [];
var scheduled = void 0;
function enqueue(callback) {
  if (!scheduled) {
    scheduled = true;
    microtask(flush$1);
  }
  flushList.push(callback);
}

function flush$1() {
  scheduled = false;
  var didFlush = Boolean(flushList.length);
  while (flushList.length) {
    flushList.shift()();
  }
  return didFlush;
}

flush$1['list'] = flushList;

var _createClass$1 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AsyncObserver = function () {
  function AsyncObserver() {
    _classCallCheck$1(this, AsyncObserver);

    this._scheduled = false;
    this.addedNodes = [];
    this.removedNodes = [];
    this.callbacks = new Set();
  }

  _createClass$1(AsyncObserver, [{
    key: 'schedule',
    value: function schedule() {
      var _this = this;

      if (!this._scheduled) {
        this._scheduled = true;
        microtask(function () {
          _this.flush();
        });
      }
    }
  }, {
    key: 'flush',
    value: function flush() {
      if (this._scheduled) {
        this._scheduled = false;
        var mutations = this.takeRecords();
        if (mutations.length) {
          this.callbacks.forEach(function (cb) {
            cb(mutations);
          });
        }
      }
    }
  }, {
    key: 'takeRecords',
    value: function takeRecords() {
      if (this.addedNodes.length || this.removedNodes.length) {
        var mutations = [{
          addedNodes: this.addedNodes,
          removedNodes: this.removedNodes
        }];
        this.addedNodes = [];
        this.removedNodes = [];
        return mutations;
      }
      return [];
    }
  }]);

  return AsyncObserver;
}();

var observeChildren = function observeChildren(node, callback) {
  node.__shady = node.__shady || {};
  if (!node.__shady.observer) {
    node.__shady.observer = new AsyncObserver();
  }
  node.__shady.observer.callbacks.add(callback);
  var observer = node.__shady.observer;
  return {
    _callback: callback,
    _observer: observer,
    _node: node,
    takeRecords: function takeRecords() {
      return observer.takeRecords();
    }
  };
};

var unobserveChildren = function unobserveChildren(handle) {
  var observer = handle && handle._observer;
  if (observer) {
    observer.callbacks.delete(handle._callback);
    if (!observer.callbacks.size) {
      handle._node.__shady.observer = null;
    }
  }
};

function filterMutations(mutations, target) {
  var targetRootNode = target.getRootNode();
  return mutations.map(function (mutation) {
    var mutationInScope = targetRootNode === mutation.target.getRootNode();
    if (mutationInScope && mutation.addedNodes) {
      var nodes = Array.from(mutation.addedNodes).filter(function (n) {
        return targetRootNode === n.getRootNode();
      });
      if (nodes.length) {
        mutation = Object.create(mutation);
        Object.defineProperty(mutation, 'addedNodes', {
          value: nodes,
          configurable: true
        });
        return mutation;
      }
    } else if (mutationInScope) {
      return mutation;
    }
  }).filter(function (m) {
    return m;
  });
}

var appendChild = Element.prototype.appendChild;
var insertBefore = Element.prototype.insertBefore;
var removeChild = Element.prototype.removeChild;
var setAttribute = Element.prototype.setAttribute;
var removeAttribute = Element.prototype.removeAttribute;
var cloneNode = Element.prototype.cloneNode;
var importNode = Document.prototype.importNode;
var addEventListener = Element.prototype.addEventListener;
var removeEventListener = Element.prototype.removeEventListener;
var windowAddEventListener = Window.prototype.addEventListener;
var windowRemoveEventListener = Window.prototype.removeEventListener;
var dispatchEvent = Element.prototype.dispatchEvent;
var querySelector = Element.prototype.querySelector;
var querySelectorAll = Element.prototype.querySelectorAll;
var contains$1 = Node.prototype.contains || HTMLElement.prototype.contains;

var nativeMethods = Object.freeze({
	appendChild: appendChild,
	insertBefore: insertBefore,
	removeChild: removeChild,
	setAttribute: setAttribute,
	removeAttribute: removeAttribute,
	cloneNode: cloneNode,
	importNode: importNode,
	addEventListener: addEventListener,
	removeEventListener: removeEventListener,
	windowAddEventListener: windowAddEventListener,
	windowRemoveEventListener: windowRemoveEventListener,
	dispatchEvent: dispatchEvent,
	querySelector: querySelector,
	querySelectorAll: querySelectorAll,
	contains: contains$1
});

var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;

function escapeReplace(c) {
  switch (c) {
    case '&':
      return '&amp;';
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    case '"':
      return '&quot;';
    case '\xA0':
      return '&nbsp;';
  }
}

function escapeAttr(s) {
  return s.replace(escapeAttrRegExp, escapeReplace);
}

function escapeData(s) {
  return s.replace(escapeDataRegExp, escapeReplace);
}

function makeSet(arr) {
  var set = {};
  for (var i = 0; i < arr.length; i++) {
    set[arr[i]] = true;
  }
  return set;
}

var voidElements = makeSet(['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

var plaintextParents = makeSet(['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes', 'plaintext', 'noscript']);

function getOuterHTML(node, parentNode, callback) {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      {
        var tagName = node.localName;
        var s = '<' + tagName;
        var attrs = node.attributes;
        for (var i = 0, attr; attr = attrs[i]; i++) {
          s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
        }
        s += '>';
        if (voidElements[tagName]) {
          return s;
        }
        return s + getInnerHTML(node, callback) + '</' + tagName + '>';
      }
    case Node.TEXT_NODE:
      {
        var data = node.data;
        if (parentNode && plaintextParents[parentNode.localName]) {
          return data;
        }
        return escapeData(data);
      }
    case Node.COMMENT_NODE:
      {
        return '<!--' + node.data + '-->';
      }
    default:
      {
        window.console.error(node);
        throw new Error('not implemented');
      }
  }
}

function getInnerHTML(node, callback) {
  if (node.localName === 'template') {
    node = node.content;
  }
  var s = '';
  var c$ = callback ? callback(node) : node.childNodes;
  for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
    s += getOuterHTML(child, node, callback);
  }
  return s;
}

var nodeWalker = document.createTreeWalker(document, NodeFilter.SHOW_ALL, null, false);

var elementWalker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT, null, false);

function parentNode(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.parentNode();
}

function firstChild(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.firstChild();
}

function lastChild(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.lastChild();
}

function previousSibling(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.previousSibling();
}

function nextSibling(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.nextSibling();
}

function childNodes(node) {
  var nodes = [];
  nodeWalker.currentNode = node;
  var n = nodeWalker.firstChild();
  while (n) {
    nodes.push(n);
    n = nodeWalker.nextSibling();
  }
  return nodes;
}

function parentElement(node) {
  elementWalker.currentNode = node;
  return elementWalker.parentNode();
}

function firstElementChild(node) {
  elementWalker.currentNode = node;
  return elementWalker.firstChild();
}

function lastElementChild(node) {
  elementWalker.currentNode = node;
  return elementWalker.lastChild();
}

function previousElementSibling(node) {
  elementWalker.currentNode = node;
  return elementWalker.previousSibling();
}

function nextElementSibling(node) {
  elementWalker.currentNode = node;
  return elementWalker.nextSibling();
}

function children(node) {
  var nodes = [];
  elementWalker.currentNode = node;
  var n = elementWalker.firstChild();
  while (n) {
    nodes.push(n);
    n = elementWalker.nextSibling();
  }
  return nodes;
}

function innerHTML(node) {
  return getInnerHTML(node, function (n) {
    return childNodes(n);
  });
}

function textContent(node) {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.DOCUMENT_FRAGMENT_NODE:
      var textWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
      var content = '',
          n = void 0;
      while (n = textWalker.nextNode()) {
        content += n.nodeValue;
      }
      return content;
    default:
      return node.nodeValue;
  }
}

var nativeTree = Object.freeze({
	parentNode: parentNode,
	firstChild: firstChild,
	lastChild: lastChild,
	previousSibling: previousSibling,
	nextSibling: nextSibling,
	childNodes: childNodes,
	parentElement: parentElement,
	firstElementChild: firstElementChild,
	lastElementChild: lastElementChild,
	previousElementSibling: previousElementSibling,
	nextElementSibling: nextElementSibling,
	children: children,
	innerHTML: innerHTML,
	textContent: textContent
});

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

var nativeInnerHTMLDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML') || Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML');

var inertDoc = document.implementation.createHTMLDocument('inert');

var nativeActiveElementDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'activeElement');
function getDocumentActiveElement() {
  if (nativeActiveElementDescriptor && nativeActiveElementDescriptor.get) {
    return nativeActiveElementDescriptor.get.call(document);
  } else if (!settings.hasDescriptors) {
    return document.activeElement;
  }
}

function activeElementForNode(node) {
  var active = getDocumentActiveElement();

  if (!active || !active.nodeType) {
    return null;
  }
  var isShadyRoot$$1 = !!isShadyRoot(node);
  if (node !== document) {
    if (!isShadyRoot$$1) {
      return null;
    }

    if (node.host === active || !contains$1.call(node.host, active)) {
      return null;
    }
  }

  var activeRoot = ownerShadyRootForNode(active);
  while (activeRoot && activeRoot !== node) {
    active = activeRoot.host;
    activeRoot = ownerShadyRootForNode(active);
  }
  if (node === document) {
    return activeRoot ? null : active;
  } else {
    return activeRoot === node ? active : null;
  }
}

var OutsideAccessors = {

  parentElement: {
    get: function get() {
      var l = this.__shady && this.__shady.parentNode;
      if (l && l.nodeType !== Node.ELEMENT_NODE) {
        l = null;
      }
      return l !== undefined ? l : parentElement(this);
    },

    configurable: true
  },

  parentNode: {
    get: function get() {
      var l = this.__shady && this.__shady.parentNode;
      return l !== undefined ? l : parentNode(this);
    },

    configurable: true
  },

  nextSibling: {
    get: function get() {
      var l = this.__shady && this.__shady.nextSibling;
      return l !== undefined ? l : nextSibling(this);
    },

    configurable: true
  },

  previousSibling: {
    get: function get() {
      var l = this.__shady && this.__shady.previousSibling;
      return l !== undefined ? l : previousSibling(this);
    },

    configurable: true
  },

  className: {
    get: function get() {
      return this.getAttribute('class') || '';
    },
    set: function set(value) {
      this.setAttribute('class', value);
    },

    configurable: true
  },

  nextElementSibling: {
    get: function get() {
      if (this.__shady && this.__shady.nextSibling !== undefined) {
        var n = this.nextSibling;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.nextSibling;
        }
        return n;
      } else {
        return nextElementSibling(this);
      }
    },

    configurable: true
  },

  previousElementSibling: {
    get: function get() {
      if (this.__shady && this.__shady.previousSibling !== undefined) {
        var n = this.previousSibling;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.previousSibling;
        }
        return n;
      } else {
        return previousElementSibling(this);
      }
    },

    configurable: true
  }

};

var InsideAccessors = {

  childNodes: {
    get: function get() {
      var childNodes$$1 = void 0;
      if (isTrackingLogicalChildNodes(this)) {
        if (!this.__shady.childNodes) {
          this.__shady.childNodes = [];
          for (var n = this.firstChild; n; n = n.nextSibling) {
            this.__shady.childNodes.push(n);
          }
        }
        childNodes$$1 = this.__shady.childNodes;
      } else {
        childNodes$$1 = childNodes(this);
      }
      childNodes$$1.item = function (index) {
        return childNodes$$1[index];
      };
      return childNodes$$1;
    },

    configurable: true
  },

  childElementCount: {
    get: function get() {
      return this.children.length;
    },

    configurable: true
  },

  firstChild: {
    get: function get() {
      var l = this.__shady && this.__shady.firstChild;
      return l !== undefined ? l : firstChild(this);
    },

    configurable: true
  },

  lastChild: {
    get: function get() {
      var l = this.__shady && this.__shady.lastChild;
      return l !== undefined ? l : lastChild(this);
    },

    configurable: true
  },

  textContent: {
    get: function get() {
      if (isTrackingLogicalChildNodes(this)) {
        var tc = [];
        for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
          if (c.nodeType !== Node.COMMENT_NODE) {
            tc.push(c.textContent);
          }
        }
        return tc.join('');
      } else {
        return textContent(this);
      }
    },
    set: function set(text) {
      switch (this.nodeType) {
        case Node.ELEMENT_NODE:
        case Node.DOCUMENT_FRAGMENT_NODE:
          clearNode(this);

          if (text.length > 0 || this.nodeType === Node.ELEMENT_NODE) {
            this.appendChild(document.createTextNode(text));
          }
          break;
        default:
          this.nodeValue = text;
          break;
      }
    },

    configurable: true
  },

  firstElementChild: {
    get: function get() {
      if (this.__shady && this.__shady.firstChild !== undefined) {
        var n = this.firstChild;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.nextSibling;
        }
        return n;
      } else {
        return firstElementChild(this);
      }
    },

    configurable: true
  },

  lastElementChild: {
    get: function get() {
      if (this.__shady && this.__shady.lastChild !== undefined) {
        var n = this.lastChild;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.previousSibling;
        }
        return n;
      } else {
        return lastElementChild(this);
      }
    },

    configurable: true
  },

  children: {
    get: function get() {
      var children$$1 = void 0;
      if (isTrackingLogicalChildNodes(this)) {
        children$$1 = Array.prototype.filter.call(this.childNodes, function (n) {
          return n.nodeType === Node.ELEMENT_NODE;
        });
      } else {
        children$$1 = children(this);
      }
      children$$1.item = function (index) {
        return children$$1[index];
      };
      return children$$1;
    },

    configurable: true
  },

  innerHTML: {
    get: function get() {
      var content = this.localName === 'template' ? this.content : this;
      if (isTrackingLogicalChildNodes(this)) {
        return getInnerHTML(content);
      } else {
        return innerHTML(content);
      }
    },
    set: function set(text) {
      var content = this.localName === 'template' ? this.content : this;
      clearNode(content);
      var containerName = this.localName;
      if (!containerName || containerName === 'template') {
        containerName = 'div';
      }
      var htmlContainer = inertDoc.createElement(containerName);
      if (nativeInnerHTMLDesc && nativeInnerHTMLDesc.set) {
        nativeInnerHTMLDesc.set.call(htmlContainer, text);
      } else {
        htmlContainer.innerHTML = text;
      }
      while (htmlContainer.firstChild) {
        content.appendChild(htmlContainer.firstChild);
      }
    },

    configurable: true
  }

};

var ShadowRootAccessor = {

  shadowRoot: {
    get: function get() {
      return this.__shady && this.__shady.publicRoot || null;
    },

    configurable: true
  }
};

var ActiveElementAccessor = {

  activeElement: {
    get: function get() {
      return activeElementForNode(this);
    },
    set: function set() {},

    configurable: true
  }

};

function patchAccessorGroup(obj, descriptors, force) {
  for (var p in descriptors) {
    var objDesc = Object.getOwnPropertyDescriptor(obj, p);
    if (objDesc && objDesc.configurable || !objDesc && force) {
      Object.defineProperty(obj, p, descriptors[p]);
    } else if (force) {
      console.warn('Could not define', p, 'on', obj);
    }
  }
}

function patchAccessors(proto) {
  patchAccessorGroup(proto, OutsideAccessors);
  patchAccessorGroup(proto, InsideAccessors);
  patchAccessorGroup(proto, ActiveElementAccessor);
}

function patchShadowRootAccessors(proto) {
  patchAccessorGroup(proto, InsideAccessors, true);
  patchAccessorGroup(proto, ActiveElementAccessor, true);
}

var patchOutsideElementAccessors = settings.hasDescriptors ? function () {} : function (element) {
  if (!(element.__shady && element.__shady.__outsideAccessors)) {
    element.__shady = element.__shady || {};
    element.__shady.__outsideAccessors = true;
    patchAccessorGroup(element, OutsideAccessors, true);
  }
};

var patchInsideElementAccessors = settings.hasDescriptors ? function () {} : function (element) {
  if (!(element.__shady && element.__shady.__insideAccessors)) {
    element.__shady = element.__shady || {};
    element.__shady.__insideAccessors = true;
    patchAccessorGroup(element, InsideAccessors, true);
    patchAccessorGroup(element, ShadowRootAccessor, true);
  }
};

function recordInsertBefore(node, container, ref_node) {
  patchInsideElementAccessors(container);
  container.__shady = container.__shady || {};
  if (container.__shady.firstChild !== undefined) {
    container.__shady.childNodes = null;
  }

  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    var c$ = node.childNodes;
    for (var i = 0; i < c$.length; i++) {
      linkNode(c$[i], container, ref_node);
    }

    node.__shady = node.__shady || {};
    var resetTo = node.__shady.firstChild !== undefined ? null : undefined;
    node.__shady.firstChild = node.__shady.lastChild = resetTo;
    node.__shady.childNodes = resetTo;
  } else {
    linkNode(node, container, ref_node);
  }
}

function linkNode(node, container, ref_node) {
  patchOutsideElementAccessors(node);
  ref_node = ref_node || null;
  node.__shady = node.__shady || {};
  container.__shady = container.__shady || {};
  if (ref_node) {
    ref_node.__shady = ref_node.__shady || {};
  }

  node.__shady.previousSibling = ref_node ? ref_node.__shady.previousSibling : container.lastChild;
  var ps = node.__shady.previousSibling;
  if (ps && ps.__shady) {
    ps.__shady.nextSibling = node;
  }

  var ns = node.__shady.nextSibling = ref_node;
  if (ns && ns.__shady) {
    ns.__shady.previousSibling = node;
  }

  node.__shady.parentNode = container;
  if (ref_node) {
    if (ref_node === container.__shady.firstChild) {
      container.__shady.firstChild = node;
    }
  } else {
    container.__shady.lastChild = node;
    if (!container.__shady.firstChild) {
      container.__shady.firstChild = node;
    }
  }

  container.__shady.childNodes = null;
}

function recordRemoveChild(node, container) {
  node.__shady = node.__shady || {};
  container.__shady = container.__shady || {};
  if (node === container.__shady.firstChild) {
    container.__shady.firstChild = node.__shady.nextSibling;
  }
  if (node === container.__shady.lastChild) {
    container.__shady.lastChild = node.__shady.previousSibling;
  }
  var p = node.__shady.previousSibling;
  var n = node.__shady.nextSibling;
  if (p) {
    p.__shady = p.__shady || {};
    p.__shady.nextSibling = n;
  }
  if (n) {
    n.__shady = n.__shady || {};
    n.__shady.previousSibling = p;
  }

  node.__shady.parentNode = node.__shady.previousSibling = node.__shady.nextSibling = undefined;
  if (container.__shady.childNodes !== undefined) {
    container.__shady.childNodes = null;
  }
}

var recordChildNodes = function recordChildNodes(node) {
  if (!node.__shady || node.__shady.firstChild === undefined) {
    node.__shady = node.__shady || {};
    node.__shady.firstChild = firstChild(node);
    node.__shady.lastChild = lastChild(node);
    patchInsideElementAccessors(node);
    var c$ = node.__shady.childNodes = childNodes(node);
    for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
      n.__shady = n.__shady || {};
      n.__shady.parentNode = node;
      n.__shady.nextSibling = c$[i + 1] || null;
      n.__shady.previousSibling = c$[i - 1] || null;
      patchOutsideElementAccessors(n);
    }
  }
};

function insertBefore$1(parent, node, ref_node) {
  if (node === parent) {
    throw Error('Failed to execute \'appendChild\' on \'Node\': The new child element contains the parent.');
  }
  if (ref_node) {
    var p = ref_node.__shady && ref_node.__shady.parentNode;
    if (p !== undefined && p !== parent || p === undefined && parentNode(ref_node) !== parent) {
      throw Error('Failed to execute \'insertBefore\' on \'Node\': The node ' + 'before which the new node is to be inserted is not a child of this node.');
    }
  }
  if (ref_node === node) {
    return node;
  }

  if (node.parentNode) {
    removeChild$1(node.parentNode, node);
  }

  var preventNativeInsert = void 0;
  var ownerRoot = ownerShadyRootForNode(parent);

  var slotsAdded = ownerRoot && findContainedSlots(node);
  if (slotsAdded) {
    ownerRoot._addSlots(slotsAdded);
  }
  if (ownerRoot && (parent.localName === 'slot' || slotsAdded)) {
    ownerRoot._asyncRender();
  }
  if (isTrackingLogicalChildNodes(parent)) {
    recordInsertBefore(node, parent, ref_node);

    if (hasShadowRootWithSlot(parent)) {
      parent.__shady.root._asyncRender();
      preventNativeInsert = true;
    } else if (parent.__shady.root) {
      preventNativeInsert = true;
    }
  }
  if (!preventNativeInsert) {
    var container = isShadyRoot(parent) ? parent.host : parent;

    if (ref_node) {
      ref_node = firstComposedNode(ref_node);
      insertBefore.call(container, node, ref_node);
    } else {
      appendChild.call(container, node);
    }
  }
  scheduleObserver(parent, node);
  return node;
}

function findContainedSlots(node) {
  if (!node['__noInsertionPoint']) {
    var slots = void 0;
    if (node.localName === 'slot') {
      slots = [node];
    } else if (node.querySelectorAll) {
      slots = node.querySelectorAll('slot');
    }
    if (slots && slots.length) {
      return slots;
    }
  }
}

function removeChild$1(parent, node) {
  if (node.parentNode !== parent) {
    throw Error('The node to be removed is not a child of this node: ' + node);
  }
  var preventNativeRemove = void 0;
  var ownerRoot = ownerShadyRootForNode(node);
  var removingInsertionPoint = void 0;
  if (isTrackingLogicalChildNodes(parent)) {
    recordRemoveChild(node, parent);
    if (hasShadowRootWithSlot(parent)) {
      parent.__shady.root._asyncRender();
      preventNativeRemove = true;
    }
  }
  removeOwnerShadyRoot(node);

  if (ownerRoot) {
    var changeSlotContent = parent && parent.localName === 'slot';
    if (changeSlotContent) {
      preventNativeRemove = true;
    }
    removingInsertionPoint = ownerRoot._removeContainedSlots(node);
    if (removingInsertionPoint || changeSlotContent) {
      ownerRoot._asyncRender();
    }
  }
  if (!preventNativeRemove) {
    var container = isShadyRoot(parent) ? parent.host : parent;

    if (!(parent.__shady.root || node.localName === 'slot') || container === parentNode(node)) {
      removeChild.call(container, node);
    }
  }
  scheduleObserver(parent, null, node);
  return node;
}

function removeOwnerShadyRoot(node) {
  if (hasCachedOwnerRoot(node)) {
    var c$ = node.childNodes;
    for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
      removeOwnerShadyRoot(n);
    }
  }
  if (node.__shady) {
    node.__shady.ownerShadyRoot = undefined;
  }
}

function hasCachedOwnerRoot(node) {
  return Boolean(node.__shady && node.__shady.ownerShadyRoot !== undefined);
}

function firstComposedNode(node) {
  var composed = node;
  if (node && node.localName === 'slot') {
    var flattened = node.__shady && node.__shady.flattenedNodes;
    composed = flattened && flattened.length ? flattened[0] : firstComposedNode(node.nextSibling);
  }
  return composed;
}

function hasShadowRootWithSlot(node) {
  var root = node && node.__shady && node.__shady.root;
  return root && root._hasInsertionPoint();
}

function distributeAttributeChange(node, name) {
  if (name === 'slot') {
    var parent = node.parentNode;
    if (hasShadowRootWithSlot(parent)) {
      parent.__shady.root._asyncRender();
    }
  } else if (node.localName === 'slot' && name === 'name') {
    var root = ownerShadyRootForNode(node);
    if (root) {
      root._updateSlotName(node);
      root._asyncRender();
    }
  }
}

function scheduleObserver(node, addedNode, removedNode) {
  var observer = node.__shady && node.__shady.observer;
  if (observer) {
    if (addedNode) {
      observer.addedNodes.push(addedNode);
    }
    if (removedNode) {
      observer.removedNodes.push(removedNode);
    }
    observer.schedule();
  }
}

function getRootNode(node, options) {
  if (!node || !node.nodeType) {
    return;
  }
  node.__shady = node.__shady || {};
  var root = node.__shady.ownerShadyRoot;
  if (root === undefined) {
    if (isShadyRoot(node)) {
      root = node;
    } else {
      var parent = node.parentNode;
      root = parent ? getRootNode(parent) : node;
    }

    if (contains$1.call(document.documentElement, node)) {
      node.__shady.ownerShadyRoot = root;
    }
  }
  return root;
}

function query(node, matcher, halter) {
  var list = [];
  queryElements(node.childNodes, matcher, halter, list);
  return list;
}

function queryElements(elements, matcher, halter, list) {
  for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
    if (c.nodeType === Node.ELEMENT_NODE && queryElement(c, matcher, halter, list)) {
      return true;
    }
  }
}

function queryElement(node, matcher, halter, list) {
  var result = matcher(node);
  if (result) {
    list.push(node);
  }
  if (halter && halter(result)) {
    return result;
  }
  queryElements(node.childNodes, matcher, halter, list);
}

function renderRootNode(element) {
  var root = element.getRootNode();
  if (isShadyRoot(root)) {
    root._render();
  }
}

var scopingShim = null;

function setAttribute$1(node, attr, value) {
  if (!scopingShim) {
    scopingShim = window['ShadyCSS'] && window['ShadyCSS']['ScopingShim'];
  }
  if (scopingShim && attr === 'class') {
    scopingShim['setElementClass'](node, value);
  } else {
    setAttribute.call(node, attr, value);
    distributeAttributeChange(node, attr);
  }
}

function removeAttribute$1(node, attr) {
  removeAttribute.call(node, attr);
  distributeAttributeChange(node, attr);
}

function cloneNode$1(node, deep) {
  if (node.localName == 'template') {
    return cloneNode.call(node, deep);
  } else {
    var n = cloneNode.call(node, false);
    if (deep) {
      var c$ = node.childNodes;
      for (var i = 0, nc; i < c$.length; i++) {
        nc = c$[i].cloneNode(true);
        n.appendChild(nc);
      }
    }
    return n;
  }
}

function importNode$1(node, deep) {
  if (node.ownerDocument !== document) {
    return importNode.call(document, node, deep);
  }
  var n = importNode.call(document, node, false);
  if (deep) {
    var c$ = node.childNodes;
    for (var i = 0, nc; i < c$.length; i++) {
      nc = importNode$1(c$[i], true);
      n.appendChild(nc);
    }
  }
  return n;
}

var _typeof$2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var eventWrappersName = '__eventWrappers' + Date.now();

var alwaysComposed = {
  'blur': true,
  'focus': true,
  'focusin': true,
  'focusout': true,
  'click': true,
  'dblclick': true,
  'mousedown': true,
  'mouseenter': true,
  'mouseleave': true,
  'mousemove': true,
  'mouseout': true,
  'mouseover': true,
  'mouseup': true,
  'wheel': true,
  'beforeinput': true,
  'input': true,
  'keydown': true,
  'keyup': true,
  'compositionstart': true,
  'compositionupdate': true,
  'compositionend': true,
  'touchstart': true,
  'touchend': true,
  'touchmove': true,
  'touchcancel': true,
  'pointerover': true,
  'pointerenter': true,
  'pointerdown': true,
  'pointermove': true,
  'pointerup': true,
  'pointercancel': true,
  'pointerout': true,
  'pointerleave': true,
  'gotpointercapture': true,
  'lostpointercapture': true,
  'dragstart': true,
  'drag': true,
  'dragenter': true,
  'dragleave': true,
  'dragover': true,
  'drop': true,
  'dragend': true,
  'DOMActivate': true,
  'DOMFocusIn': true,
  'DOMFocusOut': true,
  'keypress': true
};

function pathComposer(startNode, composed) {
  var composedPath = [];
  var current = startNode;
  var startRoot = startNode === window ? window : startNode.getRootNode();
  while (current) {
    composedPath.push(current);
    if (current.assignedSlot) {
      current = current.assignedSlot;
    } else if (current.nodeType === Node.DOCUMENT_FRAGMENT_NODE && current.host && (composed || current !== startRoot)) {
      current = current.host;
    } else {
      current = current.parentNode;
    }
  }

  if (composedPath[composedPath.length - 1] === document) {
    composedPath.push(window);
  }
  return composedPath;
}

function retarget(refNode, path) {
  if (!isShadyRoot) {
    return refNode;
  }

  var refNodePath = pathComposer(refNode, true);
  var p$ = path;
  for (var i = 0, ancestor, lastRoot, root, rootIdx; i < p$.length; i++) {
    ancestor = p$[i];
    root = ancestor === window ? window : ancestor.getRootNode();
    if (root !== lastRoot) {
      rootIdx = refNodePath.indexOf(root);
      lastRoot = root;
    }
    if (!isShadyRoot(root) || rootIdx > -1) {
      return ancestor;
    }
  }
}

var eventMixin = {
  get composed() {
    if (this.isTrusted !== false && this.__composed === undefined) {
      this.__composed = alwaysComposed[this.type];
    }
    return this.__composed || false;
  },

  composedPath: function composedPath() {
    if (!this.__composedPath) {
      this.__composedPath = pathComposer(this['__target'], this.composed);
    }
    return this.__composedPath;
  },

  get target() {
    return retarget(this.currentTarget, this.composedPath());
  },

  get relatedTarget() {
    if (!this.__relatedTarget) {
      return null;
    }
    if (!this.__relatedTargetComposedPath) {
      this.__relatedTargetComposedPath = pathComposer(this.__relatedTarget, true);
    }

    return retarget(this.currentTarget, this.__relatedTargetComposedPath);
  },
  stopPropagation: function stopPropagation() {
    Event.prototype.stopPropagation.call(this);
    this.__propagationStopped = true;
  },
  stopImmediatePropagation: function stopImmediatePropagation() {
    Event.prototype.stopImmediatePropagation.call(this);
    this.__immediatePropagationStopped = true;
    this.__propagationStopped = true;
  }
};

function mixinComposedFlag(Base) {
  var klazz = function klazz(type, options) {
    var event = new Base(type, options);
    event.__composed = options && Boolean(options['composed']);
    return event;
  };

  mixin(klazz, Base);
  klazz.prototype = Base.prototype;
  return klazz;
}

var nonBubblingEventsToRetarget = {
  'focus': true,
  'blur': true
};

function hasRetargeted(event) {
  return event['__target'] !== event.target || event.__relatedTarget !== event.relatedTarget;
}

function fireHandlers(event, node, phase) {
  var hs = node.__handlers && node.__handlers[event.type] && node.__handlers[event.type][phase];
  if (hs) {
    for (var i = 0, fn; fn = hs[i]; i++) {
      if (hasRetargeted(event) && event.target === event.relatedTarget) {
        return;
      }
      fn.call(node, event);
      if (event.__immediatePropagationStopped) {
        return;
      }
    }
  }
}

function retargetNonBubblingEvent(e) {
  var path = e.composedPath();
  var node = void 0;

  Object.defineProperty(e, 'currentTarget', {
    get: function get() {
      return node;
    },
    configurable: true
  });
  for (var i = path.length - 1; i >= 0; i--) {
    node = path[i];

    fireHandlers(e, node, 'capture');
    if (e.__propagationStopped) {
      return;
    }
  }

  Object.defineProperty(e, 'eventPhase', {
    get: function get() {
      return Event.AT_TARGET;
    }
  });

  var lastFiredRoot = void 0;
  for (var _i = 0; _i < path.length; _i++) {
    node = path[_i];
    var root = node.__shady && node.__shady.root;
    if (_i === 0 || root && root === lastFiredRoot) {
      fireHandlers(e, node, 'bubble');

      if (node !== window) {
        lastFiredRoot = node.getRootNode();
      }
      if (e.__propagationStopped) {
        return;
      }
    }
  }
}

function listenerSettingsEqual(savedListener, node, type, capture, once, passive) {
  var savedNode = savedListener.node,
      savedType = savedListener.type,
      savedCapture = savedListener.capture,
      savedOnce = savedListener.once,
      savedPassive = savedListener.passive;

  return node === savedNode && type === savedType && capture === savedCapture && once === savedOnce && passive === savedPassive;
}

function findListener(wrappers, node, type, capture, once, passive) {
  for (var i = 0; i < wrappers.length; i++) {
    if (listenerSettingsEqual(wrappers[i], node, type, capture, once, passive)) {
      return i;
    }
  }
  return -1;
}

function getEventWrappers(eventLike) {
  var wrappers = null;
  try {
    wrappers = eventLike[eventWrappersName];
  } catch (e) {}
  return wrappers;
}

function addEventListener$1(type, fnOrObj, optionsOrCapture) {
  if (!fnOrObj) {
    return;
  }

  var handlerType = typeof fnOrObj === 'undefined' ? 'undefined' : _typeof$2(fnOrObj);

  if (handlerType !== 'function' && handlerType !== 'object') {
    return;
  }

  if (handlerType === 'object' && (!fnOrObj.handleEvent || typeof fnOrObj.handleEvent !== 'function')) {
    return;
  }

  var capture = void 0,
      once = void 0,
      passive = void 0;
  if (optionsOrCapture && (typeof optionsOrCapture === 'undefined' ? 'undefined' : _typeof$2(optionsOrCapture)) === 'object') {
    capture = Boolean(optionsOrCapture.capture);
    once = Boolean(optionsOrCapture.once);
    passive = Boolean(optionsOrCapture.passive);
  } else {
    capture = Boolean(optionsOrCapture);
    once = false;
    passive = false;
  }

  var target = optionsOrCapture && optionsOrCapture.__shadyTarget || this;

  var wrappers = fnOrObj[eventWrappersName];
  if (wrappers) {
    if (findListener(wrappers, target, type, capture, once, passive) > -1) {
      return;
    }
  } else {
    fnOrObj[eventWrappersName] = [];
  }

  var wrapperFn = function wrapperFn(e) {
    if (once) {
      this.removeEventListener(type, fnOrObj, optionsOrCapture);
    }
    if (!e['__target']) {
      patchEvent(e);
    }
    var lastCurrentTargetDesc = void 0;
    if (target !== this) {
      lastCurrentTargetDesc = Object.getOwnPropertyDescriptor(e, 'currentTarget');
      Object.defineProperty(e, 'currentTarget', {
        get: function get() {
          return target;
        },
        configurable: true });
    }

    if (e.composed || e.composedPath().indexOf(target) > -1) {
      if (hasRetargeted(e) && e.target === e.relatedTarget) {
        if (e.eventPhase === Event.BUBBLING_PHASE) {
          e.stopImmediatePropagation();
        }
        return;
      }

      if (e.eventPhase !== Event.CAPTURING_PHASE && !e.bubbles && e.target !== target && !(target instanceof Window)) {
        return;
      }
      var ret = handlerType === 'function' ? fnOrObj.call(target, e) : fnOrObj.handleEvent && fnOrObj.handleEvent(e);
      if (target !== this) {
        if (lastCurrentTargetDesc) {
          Object.defineProperty(e, 'currentTarget', lastCurrentTargetDesc);
          lastCurrentTargetDesc = null;
        } else {
          delete e['currentTarget'];
        }
      }
      return ret;
    }
  };

  fnOrObj[eventWrappersName].push({
    node: this,
    type: type,
    capture: capture,
    once: once,
    passive: passive,
    wrapperFn: wrapperFn
  });

  if (nonBubblingEventsToRetarget[type]) {
    this.__handlers = this.__handlers || {};
    this.__handlers[type] = this.__handlers[type] || { 'capture': [], 'bubble': [] };
    this.__handlers[type][capture ? 'capture' : 'bubble'].push(wrapperFn);
  } else {
    var ael = this instanceof Window ? windowAddEventListener : addEventListener;
    ael.call(this, type, wrapperFn, optionsOrCapture);
  }
}

function removeEventListener$1(type, fnOrObj, optionsOrCapture) {
  if (!fnOrObj) {
    return;
  }

  var capture = void 0,
      once = void 0,
      passive = void 0;
  if (optionsOrCapture && (typeof optionsOrCapture === 'undefined' ? 'undefined' : _typeof$2(optionsOrCapture)) === 'object') {
    capture = Boolean(optionsOrCapture.capture);
    once = Boolean(optionsOrCapture.once);
    passive = Boolean(optionsOrCapture.passive);
  } else {
    capture = Boolean(optionsOrCapture);
    once = false;
    passive = false;
  }
  var target = optionsOrCapture && optionsOrCapture.__shadyTarget || this;

  var wrapperFn = undefined;
  var wrappers = getEventWrappers(fnOrObj);
  if (wrappers) {
    var idx = findListener(wrappers, target, type, capture, once, passive);
    if (idx > -1) {
      wrapperFn = wrappers.splice(idx, 1)[0].wrapperFn;

      if (!wrappers.length) {
        fnOrObj[eventWrappersName] = undefined;
      }
    }
  }
  var rel = this instanceof Window ? windowRemoveEventListener : removeEventListener;
  rel.call(this, type, wrapperFn || fnOrObj, optionsOrCapture);
  if (wrapperFn && nonBubblingEventsToRetarget[type] && this.__handlers && this.__handlers[type]) {
    var arr = this.__handlers[type][capture ? 'capture' : 'bubble'];
    var _idx = arr.indexOf(wrapperFn);
    if (_idx > -1) {
      arr.splice(_idx, 1);
    }
  }
}

function activateFocusEventOverrides() {
  for (var ev in nonBubblingEventsToRetarget) {
    window.addEventListener(ev, function (e) {
      if (!e['__target']) {
        patchEvent(e);
        retargetNonBubblingEvent(e);
      }
    }, true);
  }
}

function patchEvent(event) {
  event['__target'] = event.target;
  event.__relatedTarget = event.relatedTarget;

  if (settings.hasDescriptors) {
    patchPrototype(event, eventMixin);
  } else {
    extend(event, eventMixin);
  }
}

var PatchedEvent = mixinComposedFlag(window.Event);
var PatchedCustomEvent = mixinComposedFlag(window.CustomEvent);
var PatchedMouseEvent = mixinComposedFlag(window.MouseEvent);

function patchEvents() {
  window.Event = PatchedEvent;
  window.CustomEvent = PatchedCustomEvent;
  window.MouseEvent = PatchedMouseEvent;
  activateFocusEventOverrides();
}

function newSplice(index, removed, addedCount) {
  return {
    index: index,
    removed: removed,
    addedCount: addedCount
  };
}

var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;

function calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd) {
  var rowCount = oldEnd - oldStart + 1;
  var columnCount = currentEnd - currentStart + 1;
  var distances = new Array(rowCount);

  for (var i = 0; i < rowCount; i++) {
    distances[i] = new Array(columnCount);
    distances[i][0] = i;
  }

  for (var j = 0; j < columnCount; j++) {
    distances[0][j] = j;
  }for (var _i = 1; _i < rowCount; _i++) {
    for (var _j = 1; _j < columnCount; _j++) {
      if (equals(current[currentStart + _j - 1], old[oldStart + _i - 1])) distances[_i][_j] = distances[_i - 1][_j - 1];else {
        var north = distances[_i - 1][_j] + 1;
        var west = distances[_i][_j - 1] + 1;
        distances[_i][_j] = north < west ? north : west;
      }
    }
  }

  return distances;
}

function spliceOperationsFromEditDistances(distances) {
  var i = distances.length - 1;
  var j = distances[0].length - 1;
  var current = distances[i][j];
  var edits = [];
  while (i > 0 || j > 0) {
    if (i == 0) {
      edits.push(EDIT_ADD);
      j--;
      continue;
    }
    if (j == 0) {
      edits.push(EDIT_DELETE);
      i--;
      continue;
    }
    var northWest = distances[i - 1][j - 1];
    var west = distances[i - 1][j];
    var north = distances[i][j - 1];

    var min = void 0;
    if (west < north) min = west < northWest ? west : northWest;else min = north < northWest ? north : northWest;

    if (min == northWest) {
      if (northWest == current) {
        edits.push(EDIT_LEAVE);
      } else {
        edits.push(EDIT_UPDATE);
        current = northWest;
      }
      i--;
      j--;
    } else if (min == west) {
      edits.push(EDIT_DELETE);
      i--;
      current = west;
    } else {
      edits.push(EDIT_ADD);
      j--;
      current = north;
    }
  }

  edits.reverse();
  return edits;
}

function calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd) {
  var prefixCount = 0;
  var suffixCount = 0;
  var splice = void 0;

  var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
  if (currentStart == 0 && oldStart == 0) prefixCount = sharedPrefix(current, old, minLength);

  if (currentEnd == current.length && oldEnd == old.length) suffixCount = sharedSuffix(current, old, minLength - prefixCount);

  currentStart += prefixCount;
  oldStart += prefixCount;
  currentEnd -= suffixCount;
  oldEnd -= suffixCount;

  if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0) return [];

  if (currentStart == currentEnd) {
    splice = newSplice(currentStart, [], 0);
    while (oldStart < oldEnd) {
      splice.removed.push(old[oldStart++]);
    }return [splice];
  } else if (oldStart == oldEnd) return [newSplice(currentStart, [], currentEnd - currentStart)];

  var ops = spliceOperationsFromEditDistances(calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));

  splice = undefined;
  var splices = [];
  var index = currentStart;
  var oldIndex = oldStart;
  for (var i = 0; i < ops.length; i++) {
    switch (ops[i]) {
      case EDIT_LEAVE:
        if (splice) {
          splices.push(splice);
          splice = undefined;
        }

        index++;
        oldIndex++;
        break;
      case EDIT_UPDATE:
        if (!splice) splice = newSplice(index, [], 0);

        splice.addedCount++;
        index++;

        splice.removed.push(old[oldIndex]);
        oldIndex++;
        break;
      case EDIT_ADD:
        if (!splice) splice = newSplice(index, [], 0);

        splice.addedCount++;
        index++;
        break;
      case EDIT_DELETE:
        if (!splice) splice = newSplice(index, [], 0);

        splice.removed.push(old[oldIndex]);
        oldIndex++;
        break;
    }
  }

  if (splice) {
    splices.push(splice);
  }
  return splices;
}

function sharedPrefix(current, old, searchLength) {
  for (var i = 0; i < searchLength; i++) {
    if (!equals(current[i], old[i])) return i;
  }return searchLength;
}

function sharedSuffix(current, old, searchLength) {
  var index1 = current.length;
  var index2 = old.length;
  var count = 0;
  while (count < searchLength && equals(current[--index1], old[--index2])) {
    count++;
  }return count;
}

function equals(currentValue, previousValue) {
  return currentValue === previousValue;
}

function calculateSplices(current, previous) {
  return calcSplices(current, 0, current.length, previous, 0, previous.length);
}

var _typeof$3 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var ShadyRootConstructionToken = {};

var CATCHALL_NAME = '__catchall';

var ShadyRoot = function ShadyRoot(token, host, options) {
  if (token !== ShadyRootConstructionToken) {
    throw new TypeError('Illegal constructor');
  }

  var shadowRoot = document.createDocumentFragment();
  shadowRoot.__proto__ = ShadyRoot.prototype;
  shadowRoot._init(host, options);
  return shadowRoot;
};

ShadyRoot.prototype = Object.create(DocumentFragment.prototype);

ShadyRoot.prototype._init = function (host, options) {
  this.__localName = 'ShadyRoot';

  recordChildNodes(host);
  recordChildNodes(this);

  this.host = host;
  this._mode = options && options.mode;
  host.__shady = host.__shady || {};
  host.__shady.root = this;
  host.__shady.publicRoot = this._mode !== 'closed' ? this : null;

  this._renderPending = false;
  this._hasRendered = false;
  this._slotList = [];
  this._slotMap = {};
  this.__pendingSlots = [];

  var c$ = childNodes(host);
  for (var i = 0, l = c$.length; i < l; i++) {
    removeChild.call(host, c$[i]);
  }
};

ShadyRoot.prototype._asyncRender = function () {
  var _this = this;

  if (!this._renderPending) {
    this._renderPending = true;
    enqueue(function () {
      return _this._render();
    });
  }
};

ShadyRoot.prototype._getRenderRoot = function () {
  var renderRoot = void 0;
  var root = this;
  while (root) {
    if (root._renderPending) {
      renderRoot = root;
    }
    root = root._rendererForHost();
  }
  return renderRoot;
};

ShadyRoot.prototype._rendererForHost = function () {
  var root = this.host.getRootNode();
  if (isShadyRoot(root)) {
    var c$ = this.host.childNodes;
    for (var i = 0, c; i < c$.length; i++) {
      c = c$[i];
      if (this._isInsertionPoint(c)) {
        return root;
      }
    }
  }
};

ShadyRoot.prototype._render = function () {
  var root = this._getRenderRoot();
  if (root) {
    root['_renderRoot']();
  }
};

ShadyRoot.prototype['_renderRoot'] = function () {
  this._renderPending = false;
  this._distribute();
  this._compose();
  this._hasRendered = true;
};

ShadyRoot.prototype._distribute = function () {
  this._validateSlots();

  for (var i = 0, slot; i < this._slotList.length; i++) {
    slot = this._slotList[i];
    this._clearSlotAssignedNodes(slot);
  }

  for (var n = this.host.firstChild; n; n = n.nextSibling) {
    this._distributeNodeToSlot(n);
  }

  for (var _i = 0, _slot; _i < this._slotList.length; _i++) {
    _slot = this._slotList[_i];

    if (!_slot.__shady.assignedNodes.length) {
      for (var _n = _slot.firstChild; _n; _n = _n.nextSibling) {
        this._distributeNodeToSlot(_n, _slot);
      }
    }
    var slotParent = _slot.parentNode;
    var slotParentRoot = slotParent.__shady && slotParent.__shady.root;
    if (slotParentRoot && slotParentRoot._hasInsertionPoint()) {
      slotParentRoot['_renderRoot']();
    }
    this._addAssignedToFlattenedNodes(_slot.__shady.flattenedNodes, _slot.__shady.assignedNodes);
    var prevAssignedNodes = _slot.__shady._previouslyAssignedNodes;
    if (prevAssignedNodes) {
      for (var _i2 = 0; _i2 < prevAssignedNodes.length; _i2++) {
        prevAssignedNodes[_i2].__shady._prevAssignedSlot = null;
      }
      _slot.__shady._previouslyAssignedNodes = null;

      if (prevAssignedNodes.length > _slot.__shady.assignedNodes.length) {
        _slot.__shady.dirty = true;
      }
    }

    if (_slot.__shady.dirty) {
      _slot.__shady.dirty = false;
      this._fireSlotChange(_slot);
    }
  }
};

ShadyRoot.prototype._distributeNodeToSlot = function (node, forcedSlot) {
  node.__shady = node.__shady || {};
  var oldSlot = node.__shady._prevAssignedSlot;
  node.__shady._prevAssignedSlot = null;
  var slot = forcedSlot;
  if (!slot) {
    var name = node.slot || CATCHALL_NAME;
    var list = this._slotMap[name];
    slot = list && list[0];
  }
  if (slot) {
    slot.__shady.assignedNodes.push(node);
    node.__shady.assignedSlot = slot;
  } else {
    node.__shady.assignedSlot = undefined;
  }
  if (oldSlot !== node.__shady.assignedSlot) {
    if (node.__shady.assignedSlot) {
      node.__shady.assignedSlot.__shady.dirty = true;
    }
  }
};

ShadyRoot.prototype._clearSlotAssignedNodes = function (slot) {
  var n$ = slot.__shady.assignedNodes;
  slot.__shady.assignedNodes = [];
  slot.__shady.flattenedNodes = [];
  slot.__shady._previouslyAssignedNodes = n$;
  if (n$) {
    for (var i = 0; i < n$.length; i++) {
      var n = n$[i];
      n.__shady._prevAssignedSlot = n.__shady.assignedSlot;

      if (n.__shady.assignedSlot === slot) {
        n.__shady.assignedSlot = null;
      }
    }
  }
};

ShadyRoot.prototype._addAssignedToFlattenedNodes = function (flattened, assigned) {
  for (var i = 0, n; i < assigned.length && (n = assigned[i]); i++) {
    if (n.localName == 'slot') {
      var nestedAssigned = n.__shady.assignedNodes;
      if (nestedAssigned && nestedAssigned.length) {
        this._addAssignedToFlattenedNodes(flattened, nestedAssigned);
      }
    } else {
      flattened.push(assigned[i]);
    }
  }
};

ShadyRoot.prototype._fireSlotChange = function (slot) {
  dispatchEvent.call(slot, new Event('slotchange'));
  if (slot.__shady.assignedSlot) {
    this._fireSlotChange(slot.__shady.assignedSlot);
  }
};

ShadyRoot.prototype._compose = function () {
  var slots = this._slotList;
  var composeList = [];
  for (var i = 0; i < slots.length; i++) {
    var parent = slots[i].parentNode;

    if (!(parent.__shady && parent.__shady.root) && composeList.indexOf(parent) < 0) {
      composeList.push(parent);
    }
  }
  for (var _i3 = 0; _i3 < composeList.length; _i3++) {
    var node = composeList[_i3];
    var targetNode = node === this ? this.host : node;
    this._updateChildNodes(targetNode, this._composeNode(node));
  }
};

ShadyRoot.prototype._composeNode = function (node) {
  var children$$1 = [];
  var c$ = node.childNodes;
  for (var i = 0; i < c$.length; i++) {
    var child = c$[i];

    if (this._isInsertionPoint(child)) {
      var flattenedNodes = child.__shady.flattenedNodes;
      for (var j = 0; j < flattenedNodes.length; j++) {
        var distributedNode = flattenedNodes[j];
        children$$1.push(distributedNode);
      }
    } else {
      children$$1.push(child);
    }
  }
  return children$$1;
};

ShadyRoot.prototype._isInsertionPoint = function (node) {
  return node.localName == 'slot';
};

ShadyRoot.prototype._updateChildNodes = function (container, children$$1) {
  var composed = childNodes(container);
  var splices = calculateSplices(children$$1, composed);

  for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
    for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
      if (parentNode(n) === container) {
        removeChild.call(container, n);
      }
      composed.splice(s.index + d, 1);
    }
    d -= s.addedCount;
  }

  for (var _i4 = 0, _s, next; _i4 < splices.length && (_s = splices[_i4]); _i4++) {
    next = composed[_s.index];
    for (var _j = _s.index, _n2; _j < _s.index + _s.addedCount; _j++) {
      _n2 = children$$1[_j];
      insertBefore.call(container, _n2, next);
      composed.splice(_j, 0, _n2);
    }
  }
};

ShadyRoot.prototype._addSlots = function (slots) {
  var _pendingSlots;

  (_pendingSlots = this.__pendingSlots).push.apply(_pendingSlots, _toConsumableArray(slots));
};

ShadyRoot.prototype._validateSlots = function () {
  if (this.__pendingSlots.length) {
    this._mapSlots(this.__pendingSlots);
    this.__pendingSlots = [];
  }
};

ShadyRoot.prototype._mapSlots = function (slots) {
  var slotNamesToSort = void 0;
  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i];

    slot.__shady = slot.__shady || {};
    recordChildNodes(slot);
    recordChildNodes(slot.parentNode);
    var name = this._nameForSlot(slot);
    if (this._slotMap[name]) {
      slotNamesToSort = slotNamesToSort || {};
      slotNamesToSort[name] = true;
      this._slotMap[name].push(slot);
    } else {
      this._slotMap[name] = [slot];
    }
    this._slotList.push(slot);
  }
  if (slotNamesToSort) {
    for (var n in slotNamesToSort) {
      this._slotMap[n] = this._sortSlots(this._slotMap[n]);
    }
  }
};

ShadyRoot.prototype._nameForSlot = function (slot) {
  var name = slot['name'] || slot.getAttribute('name') || CATCHALL_NAME;
  slot.__slotName = name;
  return name;
};

ShadyRoot.prototype._sortSlots = function (slots) {
  return slots.sort(function (a, b) {
    var listA = ancestorList(a);
    var listB = ancestorList(b);
    for (var i = 0; i < listA.length; i++) {
      var nA = listA[i];
      var nB = listB[i];
      if (nA !== nB) {
        var c$ = Array.from(nA.parentNode.childNodes);
        return c$.indexOf(nA) - c$.indexOf(nB);
      }
    }
  });
};

function ancestorList(node) {
  var ancestors = [];
  do {
    ancestors.unshift(node);
  } while (node = node.parentNode);
  return ancestors;
}

ShadyRoot.prototype._removeContainedSlots = function (container) {
  this._validateSlots();
  var didRemove = void 0;
  var map = this._slotMap;
  for (var n in map) {
    var slots = map[n];
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (contains(container, slot)) {
        slots.splice(i, 1);
        var x = this._slotList.indexOf(slot);
        if (x >= 0) {
          this._slotList.splice(x, 1);
        }
        i--;
        this._removeFlattenedNodes(slot);
        didRemove = true;
      }
    }
  }
  return didRemove;
};

ShadyRoot.prototype._updateSlotName = function (slot) {
  var oldName = slot.__slotName;
  var name = this._nameForSlot(slot);
  if (name === oldName) {
    return;
  }

  var slots = this._slotMap[oldName];
  var i = slots.indexOf(slot);
  if (i >= 0) {
    slots.splice(i, 1);
  }

  var list = this._slotMap[name] || (this._slotMap[name] = []);
  list.push(slot);
  if (list.length > 1) {
    this._slotMap[name] = this._sortSlots(list);
  }
};

ShadyRoot.prototype._removeFlattenedNodes = function (slot) {
  var n$ = slot.__shady.flattenedNodes;
  if (n$) {
    for (var i = 0; i < n$.length; i++) {
      var node = n$[i];
      var parent = parentNode(node);
      if (parent) {
        removeChild.call(parent, node);
      }
    }
  }
};

ShadyRoot.prototype._hasInsertionPoint = function () {
  this._validateSlots();
  return Boolean(this._slotList.length);
};

ShadyRoot.prototype.addEventListener = function (type, fn, optionsOrCapture) {
  if ((typeof optionsOrCapture === 'undefined' ? 'undefined' : _typeof$3(optionsOrCapture)) !== 'object') {
    optionsOrCapture = {
      capture: Boolean(optionsOrCapture)
    };
  }
  optionsOrCapture.__shadyTarget = this;
  this.host.addEventListener(type, fn, optionsOrCapture);
};

ShadyRoot.prototype.removeEventListener = function (type, fn, optionsOrCapture) {
  if ((typeof optionsOrCapture === 'undefined' ? 'undefined' : _typeof$3(optionsOrCapture)) !== 'object') {
    optionsOrCapture = {
      capture: Boolean(optionsOrCapture)
    };
  }
  optionsOrCapture.__shadyTarget = this;
  this.host.removeEventListener(type, fn, optionsOrCapture);
};

ShadyRoot.prototype.getElementById = function (id) {
  var result = query(this, function (n) {
    return n.id == id;
  }, function (n) {
    return Boolean(n);
  })[0];
  return result || null;
};

function attachShadow(host, options) {
  if (!host) {
    throw 'Must provide a host.';
  }
  if (!options) {
    throw 'Not enough arguments.';
  }
  return new ShadyRoot(ShadyRootConstructionToken, host, options);
}

patchShadowRootAccessors(ShadyRoot.prototype);

function getAssignedSlot(node) {
  renderRootNode(node);
  return node.__shady && node.__shady.assignedSlot || null;
}

var windowMixin = {
  addEventListener: addEventListener$1.bind(window),

  removeEventListener: removeEventListener$1.bind(window)

};

var nodeMixin = {

  addEventListener: addEventListener$1,

  removeEventListener: removeEventListener$1,

  appendChild: function appendChild$$1(node) {
    return insertBefore$1(this, node);
  },
  insertBefore: function insertBefore$$1(node, ref_node) {
    return insertBefore$1(this, node, ref_node);
  },
  removeChild: function removeChild$$1(node) {
    return removeChild$1(this, node);
  },
  replaceChild: function replaceChild(node, ref_node) {
    insertBefore$1(this, node, ref_node);
    removeChild$1(this, ref_node);
    return node;
  },
  cloneNode: function cloneNode$$1(deep) {
    return cloneNode$1(this, deep);
  },
  getRootNode: function getRootNode$$1(options) {
    return getRootNode(this, options);
  },
  contains: function contains$$1(node) {
    return contains(this, node);
  },

  get isConnected() {
    var ownerDocument = this.ownerDocument;
    if (hasDocumentContains && contains$1.call(ownerDocument, this)) {
      return true;
    }
    if (ownerDocument.documentElement && contains$1.call(ownerDocument.documentElement, this)) {
      return true;
    }
    var node = this;
    while (node && !(node instanceof Document)) {
      node = node.parentNode || (node instanceof ShadyRoot ? node.host : undefined);
    }
    return !!(node && node instanceof Document);
  },

  dispatchEvent: function dispatchEvent$$1(event) {
    flush$1();
    return dispatchEvent.call(this, event);
  }
};

var textMixin = {
  get assignedSlot() {
    return getAssignedSlot(this);
  }
};

var fragmentMixin = {
  querySelector: function querySelector$$1(selector) {
    var result = query(this, function (n) {
      return matchesSelector(n, selector);
    }, function (n) {
      return Boolean(n);
    })[0];
    return result || null;
  },
  querySelectorAll: function querySelectorAll$$1(selector) {
    return query(this, function (n) {
      return matchesSelector(n, selector);
    });
  }
};

var slotMixin = {
  assignedNodes: function assignedNodes(options) {
    if (this.localName === 'slot') {
      renderRootNode(this);
      return this.__shady ? (options && options.flatten ? this.__shady.flattenedNodes : this.__shady.assignedNodes) || [] : [];
    }
  }
};

var elementMixin = extendAll({
  setAttribute: function setAttribute$$1(name, value) {
    setAttribute$1(this, name, value);
  },
  removeAttribute: function removeAttribute$$1(name) {
    removeAttribute$1(this, name);
  },
  attachShadow: function attachShadow$$1(options) {
    return attachShadow(this, options);
  },

  get slot() {
    return this.getAttribute('slot');
  },

  set slot(value) {
    setAttribute$1(this, 'slot', value);
  },

  get assignedSlot() {
    return getAssignedSlot(this);
  }

}, fragmentMixin, slotMixin);

Object.defineProperties(elementMixin, ShadowRootAccessor);

var documentMixin = extendAll({
  importNode: function importNode$$1(node, deep) {
    return importNode$1(node, deep);
  },
  getElementById: function getElementById(id) {
    var result = query(this, function (n) {
      return n.id == id;
    }, function (n) {
      return Boolean(n);
    })[0];
    return result || null;
  }
}, fragmentMixin);

Object.defineProperties(documentMixin, {
  '_activeElement': ActiveElementAccessor.activeElement
});

var nativeBlur = HTMLElement.prototype.blur;

var htmlElementMixin = extendAll({
  blur: function blur() {
    var root = this.__shady && this.__shady.root;
    var shadowActive = root && root.activeElement;
    if (shadowActive) {
      shadowActive.blur();
    } else {
      nativeBlur.call(this);
    }
  }
});

function patchBuiltin(proto, obj) {
  var n$ = Object.getOwnPropertyNames(obj);
  for (var i = 0; i < n$.length; i++) {
    var n = n$[i];
    var d = Object.getOwnPropertyDescriptor(obj, n);

    if (d.value) {
      proto[n] = d.value;
    } else {
      Object.defineProperty(proto, n, d);
    }
  }
}

function patchBuiltins() {
  var nativeHTMLElement = window['customElements'] && window['customElements']['nativeHTMLElement'] || HTMLElement;

  patchBuiltin(window.Node.prototype, nodeMixin);
  patchBuiltin(window.Window.prototype, windowMixin);
  patchBuiltin(window.Text.prototype, textMixin);
  patchBuiltin(window.DocumentFragment.prototype, fragmentMixin);
  patchBuiltin(window.Element.prototype, elementMixin);
  patchBuiltin(window.Document.prototype, documentMixin);
  if (window.HTMLSlotElement) {
    patchBuiltin(window.HTMLSlotElement.prototype, slotMixin);
  }
  patchBuiltin(nativeHTMLElement.prototype, htmlElementMixin);

  if (settings.hasDescriptors) {
    patchAccessors(window.Node.prototype);
    patchAccessors(window.Text.prototype);
    patchAccessors(window.DocumentFragment.prototype);
    patchAccessors(window.Element.prototype);
    patchAccessors(nativeHTMLElement.prototype);
    patchAccessors(window.Document.prototype);
    if (window.HTMLSlotElement) {
      patchAccessors(window.HTMLSlotElement.prototype);
    }
  }
}

if (settings.inUse) {
  var ShadyDOM = {
    'inUse': settings.inUse,

    'patch': function patch(node) {
      return node;
    },
    'isShadyRoot': isShadyRoot,
    'enqueue': enqueue,
    'flush': flush$1,
    'settings': settings,
    'filterMutations': filterMutations,
    'observeChildren': observeChildren,
    'unobserveChildren': unobserveChildren,
    'nativeMethods': nativeMethods,
    'nativeTree': nativeTree
  };

  window['ShadyDOM'] = ShadyDOM;

  patchEvents();

  patchBuiltins();

  window.ShadowRoot = ShadyRoot;
}

var reservedTagList = new Set(['annotation-xml', 'color-profile', 'font-face', 'font-face-src', 'font-face-uri', 'font-face-format', 'font-face-name', 'missing-glyph']);

function isValidCustomElementName(localName) {
  var reserved = reservedTagList.has(localName);
  var validForm = /^[a-z][.0-9_a-z]*-[\-.0-9_a-z]*$/.test(localName);
  return !reserved && validForm;
}

function isConnected(node) {
  var nativeValue = node.isConnected;
  if (nativeValue !== undefined) {
    return nativeValue;
  }

  var current = node;
  while (current && !(current.__CE_isImportDocument || current instanceof Document)) {
    current = current.parentNode || (window.ShadowRoot && current instanceof ShadowRoot ? current.host : undefined);
  }
  return !!(current && (current.__CE_isImportDocument || current instanceof Document));
}

function nextSiblingOrAncestorSibling(root, start) {
  var node = start;
  while (node && node !== root && !node.nextSibling) {
    node = node.parentNode;
  }
  return !node || node === root ? null : node.nextSibling;
}

function nextNode(root, start) {
  return start.firstChild ? start.firstChild : nextSiblingOrAncestorSibling(root, start);
}

function walkDeepDescendantElements(root, callback) {
  var visitedImports = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Set();

  var node = root;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      var element = node;

      callback(element);

      var localName = element.localName;
      if (localName === 'link' && element.getAttribute('rel') === 'import') {
        var importNode = element.import;
        if (importNode instanceof Node && !visitedImports.has(importNode)) {
          visitedImports.add(importNode);

          for (var child = importNode.firstChild; child; child = child.nextSibling) {
            walkDeepDescendantElements(child, callback, visitedImports);
          }
        }

        node = nextSiblingOrAncestorSibling(root, element);
        continue;
      } else if (localName === 'template') {
        node = nextSiblingOrAncestorSibling(root, element);
        continue;
      }

      var shadowRoot = element.__CE_shadowRoot;
      if (shadowRoot) {
        for (var _child = shadowRoot.firstChild; _child; _child = _child.nextSibling) {
          walkDeepDescendantElements(_child, callback, visitedImports);
        }
      }
    }

    node = nextNode(root, node);
  }
}

function setPropertyUnchecked(destination, name, value) {
  destination[name] = value;
}

var CustomElementState = {
  custom: 1,
  failed: 2
};

var _createClass$2 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$2(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CustomElementInternals = function () {
  function CustomElementInternals() {
    _classCallCheck$2(this, CustomElementInternals);

    this._localNameToDefinition = new Map();

    this._constructorToDefinition = new Map();

    this._patches = [];

    this._hasPatches = false;
  }

  _createClass$2(CustomElementInternals, [{
    key: 'setDefinition',
    value: function setDefinition(localName, definition) {
      this._localNameToDefinition.set(localName, definition);
      this._constructorToDefinition.set(definition.constructor, definition);
    }
  }, {
    key: 'localNameToDefinition',
    value: function localNameToDefinition(localName) {
      return this._localNameToDefinition.get(localName);
    }
  }, {
    key: 'constructorToDefinition',
    value: function constructorToDefinition(constructor) {
      return this._constructorToDefinition.get(constructor);
    }
  }, {
    key: 'addPatch',
    value: function addPatch(listener) {
      this._hasPatches = true;
      this._patches.push(listener);
    }
  }, {
    key: 'patchTree',
    value: function patchTree(node) {
      var _this = this;

      if (!this._hasPatches) return;

      walkDeepDescendantElements(node, function (element) {
        return _this.patch(element);
      });
    }
  }, {
    key: 'patch',
    value: function patch(node) {
      if (!this._hasPatches) return;

      if (node.__CE_patched) return;
      node.__CE_patched = true;

      for (var i = 0; i < this._patches.length; i++) {
        this._patches[i](node);
      }
    }
  }, {
    key: 'connectTree',
    value: function connectTree(root) {
      var elements = [];

      walkDeepDescendantElements(root, function (element) {
        return elements.push(element);
      });

      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        if (element.__CE_state === CustomElementState.custom) {
          this.connectedCallback(element);
        } else {
          this.upgradeElement(element);
        }
      }
    }
  }, {
    key: 'disconnectTree',
    value: function disconnectTree(root) {
      var elements = [];

      walkDeepDescendantElements(root, function (element) {
        return elements.push(element);
      });

      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        if (element.__CE_state === CustomElementState.custom) {
          this.disconnectedCallback(element);
        }
      }
    }
  }, {
    key: 'patchAndUpgradeTree',
    value: function patchAndUpgradeTree(root) {
      var _this2 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var visitedImports = options.visitedImports || new Set();
      var upgrade = options.upgrade || function (element) {
        return _this2.upgradeElement(element);
      };

      var elements = [];

      var gatherElements = function gatherElements(element) {
        if (element.localName === 'link' && element.getAttribute('rel') === 'import') {
          var importNode = element.import;

          if (importNode instanceof Node) {
            importNode.__CE_isImportDocument = true;

            importNode.__CE_hasRegistry = true;
          }

          if (importNode && importNode.readyState === 'complete') {
            importNode.__CE_documentLoadHandled = true;
          } else {
            element.addEventListener('load', function () {
              var importNode = element.import;

              if (importNode.__CE_documentLoadHandled) return;
              importNode.__CE_documentLoadHandled = true;

              var clonedVisitedImports = new Set(visitedImports);
              clonedVisitedImports.delete(importNode);

              _this2.patchAndUpgradeTree(importNode, { visitedImports: clonedVisitedImports, upgrade: upgrade });
            });
          }
        } else {
          elements.push(element);
        }
      };

      walkDeepDescendantElements(root, gatherElements, visitedImports);

      if (this._hasPatches) {
        for (var i = 0; i < elements.length; i++) {
          this.patch(elements[i]);
        }
      }

      for (var _i = 0; _i < elements.length; _i++) {
        upgrade(elements[_i]);
      }
    }
  }, {
    key: 'upgradeElement',
    value: function upgradeElement(element) {
      var currentState = element.__CE_state;
      if (currentState !== undefined) return;

      var ownerDocument = element.ownerDocument;
      if (!ownerDocument.defaultView && !(ownerDocument.__CE_isImportDocument && ownerDocument.__CE_hasRegistry)) return;

      var definition = this.localNameToDefinition(element.localName);
      if (!definition) return;

      definition.constructionStack.push(element);

      var constructor = definition.constructor;
      try {
        try {
          var result = new constructor();
          if (result !== element) {
            throw new Error('The custom element constructor did not produce the element being upgraded.');
          }
        } finally {
          definition.constructionStack.pop();
        }
      } catch (e) {
        element.__CE_state = CustomElementState.failed;
        throw e;
      }

      element.__CE_state = CustomElementState.custom;
      element.__CE_definition = definition;

      if (definition.attributeChangedCallback) {
        var observedAttributes = definition.observedAttributes;
        for (var i = 0; i < observedAttributes.length; i++) {
          var name = observedAttributes[i];
          var value = element.getAttribute(name);
          if (value !== null) {
            this.attributeChangedCallback(element, name, null, value, null);
          }
        }
      }

      if (isConnected(element)) {
        this.connectedCallback(element);
      }
    }
  }, {
    key: 'connectedCallback',
    value: function connectedCallback(element) {
      var definition = element.__CE_definition;
      if (definition.connectedCallback) {
        definition.connectedCallback.call(element);
      }
    }
  }, {
    key: 'disconnectedCallback',
    value: function disconnectedCallback(element) {
      var definition = element.__CE_definition;
      if (definition.disconnectedCallback) {
        definition.disconnectedCallback.call(element);
      }
    }
  }, {
    key: 'attributeChangedCallback',
    value: function attributeChangedCallback(element, name, oldValue, newValue, namespace) {
      var definition = element.__CE_definition;
      if (definition.attributeChangedCallback && definition.observedAttributes.indexOf(name) > -1) {
        definition.attributeChangedCallback.call(element, name, oldValue, newValue, namespace);
      }
    }
  }]);

  return CustomElementInternals;
}();

var _createClass$4 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$4(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DocumentConstructionObserver = function () {
  function DocumentConstructionObserver(internals, doc) {
    _classCallCheck$4(this, DocumentConstructionObserver);

    this._internals = internals;

    this._document = doc;

    this._observer = undefined;

    this._internals.patchAndUpgradeTree(this._document);

    if (this._document.readyState === 'loading') {
      this._observer = new MutationObserver(this._handleMutations.bind(this));

      this._observer.observe(this._document, {
        childList: true,
        subtree: true
      });
    }
  }

  _createClass$4(DocumentConstructionObserver, [{
    key: 'disconnect',
    value: function disconnect() {
      if (this._observer) {
        this._observer.disconnect();
      }
    }
  }, {
    key: '_handleMutations',
    value: function _handleMutations(mutations) {
      var readyState = this._document.readyState;
      if (readyState === 'interactive' || readyState === 'complete') {
        this.disconnect();
      }

      for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes;
        for (var j = 0; j < addedNodes.length; j++) {
          var node = addedNodes[j];
          this._internals.patchAndUpgradeTree(node);
        }
      }
    }
  }]);

  return DocumentConstructionObserver;
}();

var _createClass$5 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$5(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Deferred = function () {
  function Deferred() {
    var _this = this;

    _classCallCheck$5(this, Deferred);

    this._value = undefined;

    this._resolve = undefined;

    this._promise = new Promise(function (resolve) {
      _this._resolve = resolve;

      if (_this._value) {
        resolve(_this._value);
      }
    });
  }

  _createClass$5(Deferred, [{
    key: 'resolve',
    value: function resolve(value) {
      if (this._value) {
        throw new Error('Already resolved.');
      }

      this._value = value;

      if (this._resolve) {
        this._resolve(value);
      }
    }
  }, {
    key: 'toPromise',
    value: function toPromise() {
      return this._promise;
    }
  }]);

  return Deferred;
}();

var _createClass$3 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$3(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CustomElementRegistry = function () {
  function CustomElementRegistry(internals) {
    _classCallCheck$3(this, CustomElementRegistry);

    this._elementDefinitionIsRunning = false;

    this._internals = internals;

    this._whenDefinedDeferred = new Map();

    this._flushCallback = function (fn) {
      return fn();
    };

    this._flushPending = false;

    this._pendingDefinitions = [];

    this._documentConstructionObserver = new DocumentConstructionObserver(internals, document);
  }

  _createClass$3(CustomElementRegistry, [{
    key: 'define',
    value: function define(localName, constructor) {
      var _this = this;

      if (!(constructor instanceof Function)) {
        throw new TypeError('Custom element constructors must be functions.');
      }

      if (!isValidCustomElementName(localName)) {
        throw new SyntaxError('The element name \'' + localName + '\' is not valid.');
      }

      if (this._internals.localNameToDefinition(localName)) {
        throw new Error('A custom element with name \'' + localName + '\' has already been defined.');
      }

      if (this._elementDefinitionIsRunning) {
        throw new Error('A custom element is already being defined.');
      }
      this._elementDefinitionIsRunning = true;

      var connectedCallback = void 0;
      var disconnectedCallback = void 0;
      var adoptedCallback = void 0;
      var attributeChangedCallback = void 0;
      var observedAttributes = void 0;
      try {
        var getCallback = function getCallback(name) {
          var callbackValue = prototype[name];
          if (callbackValue !== undefined && !(callbackValue instanceof Function)) {
            throw new Error('The \'' + name + '\' callback must be a function.');
          }
          return callbackValue;
        };

        var prototype = constructor.prototype;
        if (!(prototype instanceof Object)) {
          throw new TypeError('The custom element constructor\'s prototype is not an object.');
        }

        connectedCallback = getCallback('connectedCallback');
        disconnectedCallback = getCallback('disconnectedCallback');
        adoptedCallback = getCallback('adoptedCallback');
        attributeChangedCallback = getCallback('attributeChangedCallback');
        observedAttributes = constructor['observedAttributes'] || [];
      } catch (e) {
        return;
      } finally {
        this._elementDefinitionIsRunning = false;
      }

      var definition = {
        localName: localName,
        constructor: constructor,
        connectedCallback: connectedCallback,
        disconnectedCallback: disconnectedCallback,
        adoptedCallback: adoptedCallback,
        attributeChangedCallback: attributeChangedCallback,
        observedAttributes: observedAttributes,
        constructionStack: []
      };

      this._internals.setDefinition(localName, definition);
      this._pendingDefinitions.push(definition);

      if (!this._flushPending) {
        this._flushPending = true;
        this._flushCallback(function () {
          return _this._flush();
        });
      }
    }
  }, {
    key: '_flush',
    value: function _flush() {
      var _this2 = this;

      if (this._flushPending === false) return;
      this._flushPending = false;

      var pendingDefinitions = this._pendingDefinitions;

      var elementsWithStableDefinitions = [];

      var elementsWithPendingDefinitions = new Map();
      for (var i = 0; i < pendingDefinitions.length; i++) {
        elementsWithPendingDefinitions.set(pendingDefinitions[i].localName, []);
      }

      this._internals.patchAndUpgradeTree(document, {
        upgrade: function upgrade(element) {
          if (element.__CE_state !== undefined) return;

          var localName = element.localName;

          var pendingElements = elementsWithPendingDefinitions.get(localName);
          if (pendingElements) {
            pendingElements.push(element);
          } else if (_this2._internals.localNameToDefinition(localName)) {
            elementsWithStableDefinitions.push(element);
          }
        }
      });

      for (var _i = 0; _i < elementsWithStableDefinitions.length; _i++) {
        this._internals.upgradeElement(elementsWithStableDefinitions[_i]);
      }

      while (pendingDefinitions.length > 0) {
        var definition = pendingDefinitions.shift();
        var localName = definition.localName;

        var pendingUpgradableElements = elementsWithPendingDefinitions.get(definition.localName);
        for (var _i2 = 0; _i2 < pendingUpgradableElements.length; _i2++) {
          this._internals.upgradeElement(pendingUpgradableElements[_i2]);
        }

        var deferred = this._whenDefinedDeferred.get(localName);
        if (deferred) {
          deferred.resolve(undefined);
        }
      }
    }
  }, {
    key: 'get',
    value: function get(localName) {
      var definition = this._internals.localNameToDefinition(localName);
      if (definition) {
        return definition.constructor;
      }

      return undefined;
    }
  }, {
    key: 'whenDefined',
    value: function whenDefined(localName) {
      if (!isValidCustomElementName(localName)) {
        return Promise.reject(new SyntaxError('\'' + localName + '\' is not a valid custom element name.'));
      }

      var prior = this._whenDefinedDeferred.get(localName);
      if (prior) {
        return prior.toPromise();
      }

      var deferred = new Deferred();
      this._whenDefinedDeferred.set(localName, deferred);

      var definition = this._internals.localNameToDefinition(localName);

      if (definition && !this._pendingDefinitions.some(function (d) {
        return d.localName === localName;
      })) {
        deferred.resolve(undefined);
      }

      return deferred.toPromise();
    }
  }, {
    key: 'polyfillWrapFlushCallback',
    value: function polyfillWrapFlushCallback(outer) {
      this._documentConstructionObserver.disconnect();
      var inner = this._flushCallback;
      this._flushCallback = function (flush) {
        return outer(function () {
          return inner(flush);
        });
      };
    }
  }]);

  return CustomElementRegistry;
}();

window['CustomElementRegistry'] = CustomElementRegistry;
CustomElementRegistry.prototype['define'] = CustomElementRegistry.prototype.define;
CustomElementRegistry.prototype['get'] = CustomElementRegistry.prototype.get;
CustomElementRegistry.prototype['whenDefined'] = CustomElementRegistry.prototype.whenDefined;
CustomElementRegistry.prototype['polyfillWrapFlushCallback'] = CustomElementRegistry.prototype.polyfillWrapFlushCallback;

var Native = {
  Document_createElement: window.Document.prototype.createElement,
  Document_createElementNS: window.Document.prototype.createElementNS,
  Document_importNode: window.Document.prototype.importNode,
  Document_prepend: window.Document.prototype['prepend'],
  Document_append: window.Document.prototype['append'],
  DocumentFragment_prepend: window.DocumentFragment.prototype['prepend'],
  DocumentFragment_append: window.DocumentFragment.prototype['append'],
  Node_cloneNode: window.Node.prototype.cloneNode,
  Node_appendChild: window.Node.prototype.appendChild,
  Node_insertBefore: window.Node.prototype.insertBefore,
  Node_removeChild: window.Node.prototype.removeChild,
  Node_replaceChild: window.Node.prototype.replaceChild,
  Node_textContent: Object.getOwnPropertyDescriptor(window.Node.prototype, 'textContent'),
  Element_attachShadow: window.Element.prototype['attachShadow'],
  Element_innerHTML: Object.getOwnPropertyDescriptor(window.Element.prototype, 'innerHTML'),
  Element_getAttribute: window.Element.prototype.getAttribute,
  Element_setAttribute: window.Element.prototype.setAttribute,
  Element_removeAttribute: window.Element.prototype.removeAttribute,
  Element_getAttributeNS: window.Element.prototype.getAttributeNS,
  Element_setAttributeNS: window.Element.prototype.setAttributeNS,
  Element_removeAttributeNS: window.Element.prototype.removeAttributeNS,
  Element_insertAdjacentElement: window.Element.prototype['insertAdjacentElement'],
  Element_prepend: window.Element.prototype['prepend'],
  Element_append: window.Element.prototype['append'],
  Element_before: window.Element.prototype['before'],
  Element_after: window.Element.prototype['after'],
  Element_replaceWith: window.Element.prototype['replaceWith'],
  Element_remove: window.Element.prototype['remove'],
  HTMLElement: window.HTMLElement,
  HTMLElement_innerHTML: Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'innerHTML'),
  HTMLElement_insertAdjacentElement: window.HTMLElement.prototype['insertAdjacentElement']
};

function _classCallCheck$6(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AlreadyConstructedMarker = function AlreadyConstructedMarker() {
  _classCallCheck$6(this, AlreadyConstructedMarker);
};

var AlreadyConstructedMarker$1 = new AlreadyConstructedMarker();

var PatchHTMLElement = function (internals) {
  window['HTMLElement'] = function () {
    function HTMLElement() {
      var constructor = this.constructor;

      var definition = internals.constructorToDefinition(constructor);
      if (!definition) {
        throw new Error('The custom element being constructed was not registered with `customElements`.');
      }

      var constructionStack = definition.constructionStack;

      if (constructionStack.length === 0) {
        var _element = Native.Document_createElement.call(document, definition.localName);
        Object.setPrototypeOf(_element, constructor.prototype);
        _element.__CE_state = CustomElementState.custom;
        _element.__CE_definition = definition;
        internals.patch(_element);
        return _element;
      }

      var lastIndex = constructionStack.length - 1;
      var element = constructionStack[lastIndex];
      if (element === AlreadyConstructedMarker$1) {
        throw new Error('The HTMLElement constructor was either called reentrantly for this constructor or called multiple times.');
      }
      constructionStack[lastIndex] = AlreadyConstructedMarker$1;

      Object.setPrototypeOf(element, constructor.prototype);
      internals.patch(element);

      return element;
    }

    HTMLElement.prototype = Native.HTMLElement.prototype;

    return HTMLElement;
  }();
};

var PatchParentNode = function (internals, destination, builtIn) {
  function appendPrependPatch(builtInMethod) {
    return function () {
      var flattenedNodes = [];

      var connectedElements = [];

      for (var _len = arguments.length, nodes = Array(_len), _key = 0; _key < _len; _key++) {
        nodes[_key] = arguments[_key];
      }

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        if (node instanceof Element && isConnected(node)) {
          connectedElements.push(node);
        }

        if (node instanceof DocumentFragment) {
          for (var child = node.firstChild; child; child = child.nextSibling) {
            flattenedNodes.push(child);
          }
        } else {
          flattenedNodes.push(node);
        }
      }

      builtInMethod.apply(this, nodes);

      for (var _i = 0; _i < connectedElements.length; _i++) {
        internals.disconnectTree(connectedElements[_i]);
      }

      if (isConnected(this)) {
        for (var _i2 = 0; _i2 < flattenedNodes.length; _i2++) {
          var _node = flattenedNodes[_i2];
          if (_node instanceof Element) {
            internals.connectTree(_node);
          }
        }
      }
    };
  }

  if (builtIn.prepend !== undefined) {
    setPropertyUnchecked(destination, 'prepend', appendPrependPatch(builtIn.prepend));
  }

  if (builtIn.append !== undefined) {
    setPropertyUnchecked(destination, 'append', appendPrependPatch(builtIn.append));
  }
};

var PatchDocument = function (internals) {
  setPropertyUnchecked(Document.prototype, 'createElement', function (localName) {
    if (this.__CE_hasRegistry) {
      var definition = internals.localNameToDefinition(localName);
      if (definition) {
        return new definition.constructor();
      }
    }

    var result = Native.Document_createElement.call(this, localName);
    internals.patch(result);
    return result;
  });

  setPropertyUnchecked(Document.prototype, 'importNode', function (node, deep) {
    var clone = Native.Document_importNode.call(this, node, deep);

    if (!this.__CE_hasRegistry) {
      internals.patchTree(clone);
    } else {
      internals.patchAndUpgradeTree(clone);
    }
    return clone;
  });

  var NS_HTML = "http://www.w3.org/1999/xhtml";

  setPropertyUnchecked(Document.prototype, 'createElementNS', function (namespace, localName) {
    if (this.__CE_hasRegistry && (namespace === null || namespace === NS_HTML)) {
      var definition = internals.localNameToDefinition(localName);
      if (definition) {
        return new definition.constructor();
      }
    }

    var result = Native.Document_createElementNS.call(this, namespace, localName);
    internals.patch(result);
    return result;
  });

  PatchParentNode(internals, Document.prototype, {
    prepend: Native.Document_prepend,
    append: Native.Document_append
  });
};

var PatchDocumentFragment = function (internals) {
  PatchParentNode(internals, DocumentFragment.prototype, {
    prepend: Native.DocumentFragment_prepend,
    append: Native.DocumentFragment_append
  });
};

var PatchNode = function (internals) {

  setPropertyUnchecked(Node.prototype, 'insertBefore', function (node, refNode) {
    if (node instanceof DocumentFragment) {
      var insertedNodes = Array.prototype.slice.apply(node.childNodes);
      var _nativeResult = Native.Node_insertBefore.call(this, node, refNode);

      if (isConnected(this)) {
        for (var i = 0; i < insertedNodes.length; i++) {
          internals.connectTree(insertedNodes[i]);
        }
      }

      return _nativeResult;
    }

    var nodeWasConnected = isConnected(node);
    var nativeResult = Native.Node_insertBefore.call(this, node, refNode);

    if (nodeWasConnected) {
      internals.disconnectTree(node);
    }

    if (isConnected(this)) {
      internals.connectTree(node);
    }

    return nativeResult;
  });

  setPropertyUnchecked(Node.prototype, 'appendChild', function (node) {
    if (node instanceof DocumentFragment) {
      var insertedNodes = Array.prototype.slice.apply(node.childNodes);
      var _nativeResult2 = Native.Node_appendChild.call(this, node);

      if (isConnected(this)) {
        for (var i = 0; i < insertedNodes.length; i++) {
          internals.connectTree(insertedNodes[i]);
        }
      }

      return _nativeResult2;
    }

    var nodeWasConnected = isConnected(node);
    var nativeResult = Native.Node_appendChild.call(this, node);

    if (nodeWasConnected) {
      internals.disconnectTree(node);
    }

    if (isConnected(this)) {
      internals.connectTree(node);
    }

    return nativeResult;
  });

  setPropertyUnchecked(Node.prototype, 'cloneNode', function (deep) {
    var clone = Native.Node_cloneNode.call(this, deep);

    if (!this.ownerDocument.__CE_hasRegistry) {
      internals.patchTree(clone);
    } else {
      internals.patchAndUpgradeTree(clone);
    }
    return clone;
  });

  setPropertyUnchecked(Node.prototype, 'removeChild', function (node) {
    var nodeWasConnected = isConnected(node);
    var nativeResult = Native.Node_removeChild.call(this, node);

    if (nodeWasConnected) {
      internals.disconnectTree(node);
    }

    return nativeResult;
  });

  setPropertyUnchecked(Node.prototype, 'replaceChild', function (nodeToInsert, nodeToRemove) {
    if (nodeToInsert instanceof DocumentFragment) {
      var insertedNodes = Array.prototype.slice.apply(nodeToInsert.childNodes);
      var _nativeResult3 = Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);

      if (isConnected(this)) {
        internals.disconnectTree(nodeToRemove);
        for (var i = 0; i < insertedNodes.length; i++) {
          internals.connectTree(insertedNodes[i]);
        }
      }

      return _nativeResult3;
    }

    var nodeToInsertWasConnected = isConnected(nodeToInsert);
    var nativeResult = Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);
    var thisIsConnected = isConnected(this);

    if (thisIsConnected) {
      internals.disconnectTree(nodeToRemove);
    }

    if (nodeToInsertWasConnected) {
      internals.disconnectTree(nodeToInsert);
    }

    if (thisIsConnected) {
      internals.connectTree(nodeToInsert);
    }

    return nativeResult;
  });

  function patch_textContent(destination, baseDescriptor) {
    Object.defineProperty(destination, 'textContent', {
      enumerable: baseDescriptor.enumerable,
      configurable: true,
      get: baseDescriptor.get,
      set: function set(assignedValue) {
        if (this.nodeType === Node.TEXT_NODE) {
          baseDescriptor.set.call(this, assignedValue);
          return;
        }

        var removedNodes = undefined;

        if (this.firstChild) {
          var childNodes = this.childNodes;
          var childNodesLength = childNodes.length;
          if (childNodesLength > 0 && isConnected(this)) {
            removedNodes = new Array(childNodesLength);
            for (var i = 0; i < childNodesLength; i++) {
              removedNodes[i] = childNodes[i];
            }
          }
        }

        baseDescriptor.set.call(this, assignedValue);

        if (removedNodes) {
          for (var _i = 0; _i < removedNodes.length; _i++) {
            internals.disconnectTree(removedNodes[_i]);
          }
        }
      }
    });
  }

  if (Native.Node_textContent && Native.Node_textContent.get) {
    patch_textContent(Node.prototype, Native.Node_textContent);
  } else {
    internals.addPatch(function (element) {
      patch_textContent(element, {
        enumerable: true,
        configurable: true,

        get: function get() {
          var parts = [];

          for (var i = 0; i < this.childNodes.length; i++) {
            parts.push(this.childNodes[i].textContent);
          }

          return parts.join('');
        },
        set: function set(assignedValue) {
          while (this.firstChild) {
            Native.Node_removeChild.call(this, this.firstChild);
          }
          Native.Node_appendChild.call(this, document.createTextNode(assignedValue));
        }
      });
    });
  }
};

var PatchChildNode = function (internals, destination, builtIn) {
  function beforeAfterPatch(builtInMethod) {
    return function () {
      var flattenedNodes = [];

      var connectedElements = [];

      for (var _len = arguments.length, nodes = Array(_len), _key = 0; _key < _len; _key++) {
        nodes[_key] = arguments[_key];
      }

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        if (node instanceof Element && isConnected(node)) {
          connectedElements.push(node);
        }

        if (node instanceof DocumentFragment) {
          for (var child = node.firstChild; child; child = child.nextSibling) {
            flattenedNodes.push(child);
          }
        } else {
          flattenedNodes.push(node);
        }
      }

      builtInMethod.apply(this, nodes);

      for (var _i = 0; _i < connectedElements.length; _i++) {
        internals.disconnectTree(connectedElements[_i]);
      }

      if (isConnected(this)) {
        for (var _i2 = 0; _i2 < flattenedNodes.length; _i2++) {
          var _node = flattenedNodes[_i2];
          if (_node instanceof Element) {
            internals.connectTree(_node);
          }
        }
      }
    };
  }

  if (builtIn.before !== undefined) {
    setPropertyUnchecked(destination, 'before', beforeAfterPatch(builtIn.before));
  }

  if (builtIn.before !== undefined) {
    setPropertyUnchecked(destination, 'after', beforeAfterPatch(builtIn.after));
  }

  if (builtIn.replaceWith !== undefined) {
    setPropertyUnchecked(destination, 'replaceWith', function () {
      var flattenedNodes = [];

      var connectedElements = [];

      for (var _len2 = arguments.length, nodes = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        nodes[_key2] = arguments[_key2];
      }

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        if (node instanceof Element && isConnected(node)) {
          connectedElements.push(node);
        }

        if (node instanceof DocumentFragment) {
          for (var child = node.firstChild; child; child = child.nextSibling) {
            flattenedNodes.push(child);
          }
        } else {
          flattenedNodes.push(node);
        }
      }

      var wasConnected = isConnected(this);

      builtIn.replaceWith.apply(this, nodes);

      for (var _i3 = 0; _i3 < connectedElements.length; _i3++) {
        internals.disconnectTree(connectedElements[_i3]);
      }

      if (wasConnected) {
        internals.disconnectTree(this);
        for (var _i4 = 0; _i4 < flattenedNodes.length; _i4++) {
          var _node2 = flattenedNodes[_i4];
          if (_node2 instanceof Element) {
            internals.connectTree(_node2);
          }
        }
      }
    });
  }

  if (builtIn.remove !== undefined) {
    setPropertyUnchecked(destination, 'remove', function () {
      var wasConnected = isConnected(this);

      builtIn.remove.call(this);

      if (wasConnected) {
        internals.disconnectTree(this);
      }
    });
  }
};

var PatchElement = function (internals) {
  if (Native.Element_attachShadow) {
    setPropertyUnchecked(Element.prototype, 'attachShadow', function (init) {
      var shadowRoot = Native.Element_attachShadow.call(this, init);
      this.__CE_shadowRoot = shadowRoot;
      return shadowRoot;
    });
  }

  function patch_innerHTML(destination, baseDescriptor) {
    Object.defineProperty(destination, 'innerHTML', {
      enumerable: baseDescriptor.enumerable,
      configurable: true,
      get: baseDescriptor.get,
      set: function set(htmlString) {
        var _this = this;

        var isConnected$$1 = isConnected(this);

        var removedElements = undefined;
        if (isConnected$$1) {
          removedElements = [];
          walkDeepDescendantElements(this, function (element) {
            if (element !== _this) {
              removedElements.push(element);
            }
          });
        }

        baseDescriptor.set.call(this, htmlString);

        if (removedElements) {
          for (var i = 0; i < removedElements.length; i++) {
            var element = removedElements[i];
            if (element.__CE_state === CustomElementState.custom) {
              internals.disconnectedCallback(element);
            }
          }
        }

        if (!this.ownerDocument.__CE_hasRegistry) {
          internals.patchTree(this);
        } else {
          internals.patchAndUpgradeTree(this);
        }
        return htmlString;
      }
    });
  }

  if (Native.Element_innerHTML && Native.Element_innerHTML.get) {
    patch_innerHTML(Element.prototype, Native.Element_innerHTML);
  } else if (Native.HTMLElement_innerHTML && Native.HTMLElement_innerHTML.get) {
    patch_innerHTML(HTMLElement.prototype, Native.HTMLElement_innerHTML);
  } else {

    internals.addPatch(function (element) {
      patch_innerHTML(element, {
        enumerable: true,
        configurable: true,

        get: function get() {
          return Native.Node_cloneNode.call(this, true).innerHTML;
        },

        set: function set(assignedValue) {
          var isTemplate = this.localName === 'template';

          var content = isTemplate ? this.content : this;

          var rawElement = Native.Document_createElement.call(document, this.localName);
          rawElement.innerHTML = assignedValue;

          while (content.childNodes.length > 0) {
            Native.Node_removeChild.call(content, content.childNodes[0]);
          }
          var container = isTemplate ? rawElement.content : rawElement;
          while (container.childNodes.length > 0) {
            Native.Node_appendChild.call(content, container.childNodes[0]);
          }
        }
      });
    });
  }

  setPropertyUnchecked(Element.prototype, 'setAttribute', function (name, newValue) {
    if (this.__CE_state !== CustomElementState.custom) {
      return Native.Element_setAttribute.call(this, name, newValue);
    }

    var oldValue = Native.Element_getAttribute.call(this, name);
    Native.Element_setAttribute.call(this, name, newValue);
    newValue = Native.Element_getAttribute.call(this, name);
    internals.attributeChangedCallback(this, name, oldValue, newValue, null);
  });

  setPropertyUnchecked(Element.prototype, 'setAttributeNS', function (namespace, name, newValue) {
    if (this.__CE_state !== CustomElementState.custom) {
      return Native.Element_setAttributeNS.call(this, namespace, name, newValue);
    }

    var oldValue = Native.Element_getAttributeNS.call(this, namespace, name);
    Native.Element_setAttributeNS.call(this, namespace, name, newValue);
    newValue = Native.Element_getAttributeNS.call(this, namespace, name);
    internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
  });

  setPropertyUnchecked(Element.prototype, 'removeAttribute', function (name) {
    if (this.__CE_state !== CustomElementState.custom) {
      return Native.Element_removeAttribute.call(this, name);
    }

    var oldValue = Native.Element_getAttribute.call(this, name);
    Native.Element_removeAttribute.call(this, name);
    if (oldValue !== null) {
      internals.attributeChangedCallback(this, name, oldValue, null, null);
    }
  });

  setPropertyUnchecked(Element.prototype, 'removeAttributeNS', function (namespace, name) {
    if (this.__CE_state !== CustomElementState.custom) {
      return Native.Element_removeAttributeNS.call(this, namespace, name);
    }

    var oldValue = Native.Element_getAttributeNS.call(this, namespace, name);
    Native.Element_removeAttributeNS.call(this, namespace, name);

    var newValue = Native.Element_getAttributeNS.call(this, namespace, name);
    if (oldValue !== newValue) {
      internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
    }
  });

  function patch_insertAdjacentElement(destination, baseMethod) {
    setPropertyUnchecked(destination, 'insertAdjacentElement', function (where, element) {
      var wasConnected = isConnected(element);
      var insertedElement = baseMethod.call(this, where, element);

      if (wasConnected) {
        internals.disconnectTree(element);
      }

      if (isConnected(insertedElement)) {
        internals.connectTree(element);
      }
      return insertedElement;
    });
  }

  if (Native.HTMLElement_insertAdjacentElement) {
    patch_insertAdjacentElement(HTMLElement.prototype, Native.HTMLElement_insertAdjacentElement);
  } else if (Native.Element_insertAdjacentElement) {
    patch_insertAdjacentElement(Element.prototype, Native.Element_insertAdjacentElement);
  } else {
    console.warn('Custom Elements: `Element#insertAdjacentElement` was not patched.');
  }

  PatchParentNode(internals, Element.prototype, {
    prepend: Native.Element_prepend,
    append: Native.Element_append
  });

  PatchChildNode(internals, Element.prototype, {
    before: Native.Element_before,
    after: Native.Element_after,
    replaceWith: Native.Element_replaceWith,
    remove: Native.Element_remove
  });
};

var priorCustomElements = window['customElements'];

if (!priorCustomElements || priorCustomElements['forcePolyfill'] || typeof priorCustomElements['define'] != 'function' || typeof priorCustomElements['get'] != 'function') {
  var internals = new CustomElementInternals();

  PatchHTMLElement(internals);
  PatchDocument(internals);
  PatchDocumentFragment(internals);
  PatchNode(internals);
  PatchElement(internals);

  document.__CE_hasRegistry = true;

  var customElements = new CustomElementRegistry(internals);

  Object.defineProperty(window, 'customElements', {
    configurable: true,
    enumerable: true,
    value: customElements
  });
}

function _classCallCheck$8(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StyleNode = function StyleNode() {
  _classCallCheck$8(this, StyleNode);

  this['start'] = 0;

  this['end'] = 0;

  this['previous'] = null;

  this['parent'] = null;

  this['rules'] = null;

  this['parsedCssText'] = '';

  this['cssText'] = '';

  this['atRule'] = false;

  this['type'] = 0;

  this['keyframesName'] = '';

  this['selector'] = '';

  this['parsedSelector'] = '';
};

function parse(text) {
  text = clean(text);
  return parseCss(lex(text), text);
}

function clean(cssText) {
  return cssText.replace(RX.comments, '').replace(RX.port, '');
}

function lex(text) {
  var root = new StyleNode();
  root['start'] = 0;
  root['end'] = text.length;
  var n = root;
  for (var i = 0, l = text.length; i < l; i++) {
    if (text[i] === OPEN_BRACE) {
      if (!n['rules']) {
        n['rules'] = [];
      }
      var p = n;
      var previous = p['rules'][p['rules'].length - 1] || null;
      n = new StyleNode();
      n['start'] = i + 1;
      n['parent'] = p;
      n['previous'] = previous;
      p['rules'].push(n);
    } else if (text[i] === CLOSE_BRACE) {
      n['end'] = i + 1;
      n = n['parent'] || root;
    }
  }
  return root;
}

function parseCss(node, text) {
  var t = text.substring(node['start'], node['end'] - 1);
  node['parsedCssText'] = node['cssText'] = t.trim();
  if (node['parent']) {
    var ss = node['previous'] ? node['previous']['end'] : node['parent']['start'];
    t = text.substring(ss, node['start'] - 1);
    t = _expandUnicodeEscapes(t);
    t = t.replace(RX.multipleSpaces, ' ');

    t = t.substring(t.lastIndexOf(';') + 1);
    var s = node['parsedSelector'] = node['selector'] = t.trim();
    node['atRule'] = s.indexOf(AT_START) === 0;

    if (node['atRule']) {
      if (s.indexOf(MEDIA_START) === 0) {
        node['type'] = types.MEDIA_RULE;
      } else if (s.match(RX.keyframesRule)) {
        node['type'] = types.KEYFRAMES_RULE;
        node['keyframesName'] = node['selector'].split(RX.multipleSpaces).pop();
      }
    } else {
      if (s.indexOf(VAR_START) === 0) {
        node['type'] = types.MIXIN_RULE;
      } else {
        node['type'] = types.STYLE_RULE;
      }
    }
  }
  var r$ = node['rules'];
  if (r$) {
    for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
      parseCss(r, text);
    }
  }
  return node;
}

function _expandUnicodeEscapes(s) {
  return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
    var code = arguments[1],
        repeat = 6 - code.length;
    while (repeat--) {
      code = '0' + code;
    }
    return '\\' + code;
  });
}

function stringify(node, preserveProperties) {
  var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  var cssText = '';
  if (node['cssText'] || node['rules']) {
    var r$ = node['rules'];
    if (r$ && !_hasMixinRules(r$)) {
      for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
        cssText = stringify(r, preserveProperties, cssText);
      }
    } else {
      cssText = preserveProperties ? node['cssText'] : removeCustomProps(node['cssText']);
      cssText = cssText.trim();
      if (cssText) {
        cssText = '  ' + cssText + '\n';
      }
    }
  }

  if (cssText) {
    if (node['selector']) {
      text += node['selector'] + ' ' + OPEN_BRACE + '\n';
    }
    text += cssText;
    if (node['selector']) {
      text += CLOSE_BRACE + '\n\n';
    }
  }
  return text;
}

function _hasMixinRules(rules) {
  var r = rules[0];
  return Boolean(r) && Boolean(r['selector']) && r['selector'].indexOf(VAR_START) === 0;
}

function removeCustomProps(cssText) {
  cssText = removeCustomPropAssignment(cssText);
  return removeCustomPropApply(cssText);
}

function removeCustomPropAssignment(cssText) {
  return cssText.replace(RX.customProp, '').replace(RX.mixinProp, '');
}

function removeCustomPropApply(cssText) {
  return cssText.replace(RX.mixinApply, '').replace(RX.varApply, '');
}

var types = {
  STYLE_RULE: 1,
  KEYFRAMES_RULE: 7,
  MEDIA_RULE: 4,
  MIXIN_RULE: 1000
};

var OPEN_BRACE = '{';
var CLOSE_BRACE = '}';

var RX = {
  comments: /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,
  port: /@import[^;]*;/gim,
  customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
  mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
  mixinApply: /@apply\s*\(?[^);]*\)?\s*(?:[;\n]|$)?/gim,
  varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
  keyframesRule: /^@[^\s]*keyframes/,
  multipleSpaces: /\s+/g
};

var VAR_START = '--';
var MEDIA_START = '@media';
var AT_START = '@';

var nativeShadow = !(window['ShadyDOM'] && window['ShadyDOM']['inUse']);
var nativeCssVariables = void 0;

function calcCssVariables(settings) {
  if (settings && settings['shimcssproperties']) {
    nativeCssVariables = false;
  } else {
    nativeCssVariables = nativeShadow || Boolean(!navigator.userAgent.match(/AppleWebKit\/601|Edge\/15/) && window.CSS && CSS.supports && CSS.supports('box-shadow', '0 0 0 var(--foo)'));
  }
}

if (window.ShadyCSS && window.ShadyCSS.nativeCss !== undefined) {
  nativeCssVariables = window.ShadyCSS.nativeCss;
} else if (window.ShadyCSS) {
  calcCssVariables(window.ShadyCSS);

  window.ShadyCSS = undefined;
} else {
  calcCssVariables(window['WebComponents'] && window['WebComponents']['flags']);
}

var VAR_ASSIGN = /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};{])+)|\{([^}]*)\}(?:(?=[;\s}])|$))/gi;
var MIXIN_MATCH = /(?:^|\W+)@apply\s*\(?([^);\n]*)\)?/gi;
var VAR_CONSUMED = /(--[\w-]+)\s*([:,;)]|$)/gi;
var ANIMATION_MATCH = /(animation\s*:)|(animation-name\s*:)/;
var MEDIA_MATCH = /@media\s(.*)/;

var BRACKETED = /\{[^}]*\}/g;
var HOST_PREFIX = '(?:^|[^.#[:])';
var HOST_SUFFIX = '($|[.:[\\s>+~])';

var styleTextSet = new Set();

var scopingAttribute = 'shady-unscoped';

function processUnscopedStyle(style) {
  var text = style.textContent;
  if (!styleTextSet.has(text)) {
    styleTextSet.add(text);
    var newStyle = style.cloneNode(true);
    document.head.appendChild(newStyle);
  }
}

function isUnscopedStyle(style) {
  return style.hasAttribute(scopingAttribute);
}

function toCssText(rules, callback) {
  if (!rules) {
    return '';
  }
  if (typeof rules === 'string') {
    rules = parse(rules);
  }
  if (callback) {
    forEachRule(rules, callback);
  }
  return stringify(rules, nativeCssVariables);
}

function rulesForStyle(style) {
  if (!style['__cssRules'] && style.textContent) {
    style['__cssRules'] = parse(style.textContent);
  }
  return style['__cssRules'] || null;
}

function isKeyframesSelector(rule) {
  return Boolean(rule['parent']) && rule['parent']['type'] === types.KEYFRAMES_RULE;
}

function forEachRule(node, styleRuleCallback, keyframesRuleCallback, onlyActiveRules) {
  if (!node) {
    return;
  }
  var skipRules = false;
  var type = node['type'];
  if (onlyActiveRules) {
    if (type === types.MEDIA_RULE) {
      var matchMedia = node['selector'].match(MEDIA_MATCH);
      if (matchMedia) {
        if (!window.matchMedia(matchMedia[1]).matches) {
          skipRules = true;
        }
      }
    }
  }
  if (type === types.STYLE_RULE) {
    styleRuleCallback(node);
  } else if (keyframesRuleCallback && type === types.KEYFRAMES_RULE) {
    keyframesRuleCallback(node);
  } else if (type === types.MIXIN_RULE) {
    skipRules = true;
  }
  var r$ = node['rules'];
  if (r$ && !skipRules) {
    for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
      forEachRule(r, styleRuleCallback, keyframesRuleCallback, onlyActiveRules);
    }
  }
}

function applyCss(cssText, moniker, target, contextNode) {
  var style = createScopeStyle(cssText, moniker);
  applyStyle(style, target, contextNode);
  return style;
}

function createScopeStyle(cssText, moniker) {
  var style = document.createElement('style');
  if (moniker) {
    style.setAttribute('scope', moniker);
  }
  style.textContent = cssText;
  return style;
}

var lastHeadApplyNode = null;

function applyStylePlaceHolder(moniker) {
  var placeHolder = document.createComment(' Shady DOM styles for ' + moniker + ' ');
  var after = lastHeadApplyNode ? lastHeadApplyNode['nextSibling'] : null;
  var scope = document.head;
  scope.insertBefore(placeHolder, after || scope.firstChild);
  lastHeadApplyNode = placeHolder;
  return placeHolder;
}

function applyStyle(style, target, contextNode) {
  target = target || document.head;
  var after = contextNode && contextNode.nextSibling || target.firstChild;
  target.insertBefore(style, after);
  if (!lastHeadApplyNode) {
    lastHeadApplyNode = style;
  } else {
    var position = style.compareDocumentPosition(lastHeadApplyNode);
    if (position === Node.DOCUMENT_POSITION_PRECEDING) {
      lastHeadApplyNode = style;
    }
  }
}





function findMatchingParen(text, start) {
  var level = 0;
  for (var i = start, l = text.length; i < l; i++) {
    if (text[i] === '(') {
      level++;
    } else if (text[i] === ')') {
      if (--level === 0) {
        return i;
      }
    }
  }
  return -1;
}

function processVariableAndFallback(str, callback) {
  var start = str.indexOf('var(');
  if (start === -1) {
    return callback(str, '', '', '');
  }

  var end = findMatchingParen(str, start + 3);
  var inner = str.substring(start + 4, end);
  var prefix = str.substring(0, start);

  var suffix = processVariableAndFallback(str.substring(end + 1), callback);
  var comma = inner.indexOf(',');

  if (comma === -1) {
    return callback(prefix, inner.trim(), '', suffix);
  }

  var value = inner.substring(0, comma).trim();
  var fallback = inner.substring(comma + 1).trim();
  return callback(prefix, value, fallback, suffix);
}

function setElementClassRaw(element, value) {
  if (nativeShadow) {
    element.setAttribute('class', value);
  } else {
    window['ShadyDOM']['nativeMethods']['setAttribute'].call(element, 'class', value);
  }
}

function getIsExtends(element) {
  var localName = element['localName'];
  var is = '',
      typeExtension = '';

  if (localName) {
    if (localName.indexOf('-') > -1) {
      is = localName;
    } else {
      typeExtension = localName;
      is = element.getAttribute && element.getAttribute('is') || '';
    }
  } else {
    is = element.is;
    typeExtension = element.extends;
  }
  return { is: is, typeExtension: typeExtension };
}

function gatherStyleText(element) {
  var styleTextParts = [];
  var styles = element.querySelectorAll('style');
  for (var i = 0; i < styles.length; i++) {
    var style = styles[i];
    if (isUnscopedStyle(style)) {
      if (!nativeShadow) {
        processUnscopedStyle(style);
        style.parentNode.removeChild(style);
      }
    } else {
      styleTextParts.push(style.textContent);
      style.parentNode.removeChild(style);
    }
  }
  return styleTextParts.join('').trim();
}

var _createClass$7 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$9(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SCOPE_NAME = 'style-scope';

var StyleTransformer = function () {
  function StyleTransformer() {
    _classCallCheck$9(this, StyleTransformer);
  }

  _createClass$7(StyleTransformer, [{
    key: 'dom',
    value: function dom(node, scope, shouldRemoveScope) {
      if (node['__styleScoped']) {
        node['__styleScoped'] = null;
      } else {
        this._transformDom(node, scope || '', shouldRemoveScope);
      }
    }
  }, {
    key: '_transformDom',
    value: function _transformDom(node, selector, shouldRemoveScope) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this.element(node, selector, shouldRemoveScope);
      }
      var c$ = node.localName === 'template' ? (node.content || node._content).childNodes : node.children || node.childNodes;
      if (c$) {
        for (var i = 0; i < c$.length; i++) {
          this._transformDom(c$[i], selector, shouldRemoveScope);
        }
      }
    }
  }, {
    key: 'element',
    value: function element(_element, scope, shouldRemoveScope) {
      if (scope) {
        if (_element.classList) {
          if (shouldRemoveScope) {
            _element.classList.remove(SCOPE_NAME);
            _element.classList.remove(scope);
          } else {
            _element.classList.add(SCOPE_NAME);
            _element.classList.add(scope);
          }
        } else if (_element.getAttribute) {
          var c = _element.getAttribute(CLASS);
          if (shouldRemoveScope) {
            if (c) {
              var newValue = c.replace(SCOPE_NAME, '').replace(scope, '');
              setElementClassRaw(_element, newValue);
            }
          } else {
            var _newValue = (c ? c + ' ' : '') + SCOPE_NAME + ' ' + scope;
            setElementClassRaw(_element, _newValue);
          }
        }
      }
    }
  }, {
    key: 'elementStyles',
    value: function elementStyles(element, styleRules, callback) {
      var cssBuildType = element['__cssBuild'];

      var cssText = '';
      if (nativeShadow || cssBuildType === 'shady') {
        cssText = toCssText(styleRules, callback);
      } else {
        var _StyleUtil$getIsExten = getIsExtends(element),
            is = _StyleUtil$getIsExten.is,
            typeExtension = _StyleUtil$getIsExten.typeExtension;

        cssText = this.css(styleRules, is, typeExtension, callback) + '\n\n';
      }
      return cssText.trim();
    }
  }, {
    key: 'css',
    value: function css(rules, scope, ext, callback) {
      var hostScope = this._calcHostScope(scope, ext);
      scope = this._calcElementScope(scope);
      var self = this;
      return toCssText(rules, function (rule) {
        if (!rule.isScoped) {
          self.rule(rule, scope, hostScope);
          rule.isScoped = true;
        }
        if (callback) {
          callback(rule, scope, hostScope);
        }
      });
    }
  }, {
    key: '_calcElementScope',
    value: function _calcElementScope(scope) {
      if (scope) {
        return CSS_CLASS_PREFIX + scope;
      } else {
        return '';
      }
    }
  }, {
    key: '_calcHostScope',
    value: function _calcHostScope(scope, ext) {
      return ext ? '[is=' + scope + ']' : scope;
    }
  }, {
    key: 'rule',
    value: function rule(_rule, scope, hostScope) {
      this._transformRule(_rule, this._transformComplexSelector, scope, hostScope);
    }
  }, {
    key: '_transformRule',
    value: function _transformRule(rule, transformer, scope, hostScope) {
      rule['selector'] = rule.transformedSelector = this._transformRuleCss(rule, transformer, scope, hostScope);
    }
  }, {
    key: '_transformRuleCss',
    value: function _transformRuleCss(rule, transformer, scope, hostScope) {
      var p$ = rule['selector'].split(COMPLEX_SELECTOR_SEP);

      if (!isKeyframesSelector(rule)) {
        for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
          p$[i] = transformer.call(this, p, scope, hostScope);
        }
      }
      return p$.join(COMPLEX_SELECTOR_SEP);
    }
  }, {
    key: '_twiddleNthPlus',
    value: function _twiddleNthPlus(selector) {
      return selector.replace(NTH, function (m, type, inside) {
        if (inside.indexOf('+') > -1) {
          inside = inside.replace(/\+/g, '___');
        } else if (inside.indexOf('___') > -1) {
          inside = inside.replace(/___/g, '+');
        }
        return ':' + type + '(' + inside + ')';
      });
    }
  }, {
    key: '_transformComplexSelector',
    value: function _transformComplexSelector(selector, scope, hostScope) {
      var _this = this;

      var stop = false;
      selector = selector.trim();

      var isNth = NTH.test(selector);
      if (isNth) {
        selector = selector.replace(NTH, function (m, type, inner) {
          return ':' + type + '(' + inner.replace(/\s/g, '') + ')';
        });
        selector = this._twiddleNthPlus(selector);
      }
      selector = selector.replace(SLOTTED_START, HOST + ' $1');
      selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
        if (!stop) {
          var info = _this._transformCompoundSelector(s, c, scope, hostScope);
          stop = stop || info.stop;
          c = info.combinator;
          s = info.value;
        }
        return c + s;
      });
      if (isNth) {
        selector = this._twiddleNthPlus(selector);
      }
      return selector;
    }
  }, {
    key: '_transformCompoundSelector',
    value: function _transformCompoundSelector(selector, combinator, scope, hostScope) {
      var slottedIndex = selector.indexOf(SLOTTED);
      if (selector.indexOf(HOST) >= 0) {
        selector = this._transformHostSelector(selector, hostScope);
      } else if (slottedIndex !== 0) {
        selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
      }

      var slotted = false;
      if (slottedIndex >= 0) {
        combinator = '';
        slotted = true;
      }

      var stop = void 0;
      if (slotted) {
        stop = true;
        if (slotted) {
          selector = selector.replace(SLOTTED_PAREN, function (m, paren) {
            return ' > ' + paren;
          });
        }
      }
      selector = selector.replace(DIR_PAREN, function (m, before, dir) {
        return '[dir="' + dir + '"] ' + before + ', ' + before + '[dir="' + dir + '"]';
      });
      return { value: selector, combinator: combinator, stop: stop };
    }
  }, {
    key: '_transformSimpleSelector',
    value: function _transformSimpleSelector(selector, scope) {
      var p$ = selector.split(PSEUDO_PREFIX);
      p$[0] += scope;
      return p$.join(PSEUDO_PREFIX);
    }
  }, {
    key: '_transformHostSelector',
    value: function _transformHostSelector(selector, hostScope) {
      var m = selector.match(HOST_PAREN);
      var paren = m && m[2].trim() || '';
      if (paren) {
        if (!paren[0].match(SIMPLE_SELECTOR_PREFIX)) {
          var typeSelector = paren.split(SIMPLE_SELECTOR_PREFIX)[0];

          if (typeSelector === hostScope) {
            return paren;
          } else {
            return SELECTOR_NO_MATCH;
          }
        } else {
          return selector.replace(HOST_PAREN, function (m, host, paren) {
            return hostScope + paren;
          });
        }
      } else {
        return selector.replace(HOST, hostScope);
      }
    }
  }, {
    key: 'documentRule',
    value: function documentRule(rule) {
      rule['selector'] = rule['parsedSelector'];
      this.normalizeRootSelector(rule);
      this._transformRule(rule, this._transformDocumentSelector);
    }
  }, {
    key: 'normalizeRootSelector',
    value: function normalizeRootSelector(rule) {
      if (rule['selector'] === ROOT) {
        rule['selector'] = 'html';
      }
    }
  }, {
    key: '_transformDocumentSelector',
    value: function _transformDocumentSelector(selector) {
      return selector.match(SLOTTED) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
    }
  }, {
    key: 'SCOPE_NAME',
    get: function get() {
      return SCOPE_NAME;
    }
  }]);

  return StyleTransformer;
}();

var NTH = /:(nth[-\w]+)\(([^)]+)\)/;
var SCOPE_DOC_SELECTOR = ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=[])+)/g;
var SIMPLE_SELECTOR_PREFIX = /[[.:#*]/;
var HOST = ':host';
var ROOT = ':root';
var SLOTTED = '::slotted';
var SLOTTED_START = new RegExp('^(' + SLOTTED + ')');

var HOST_PAREN = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/;

var SLOTTED_PAREN = /(?:::slotted)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/;
var DIR_PAREN = /(.*):dir\((?:(ltr|rtl))\)/;
var CSS_CLASS_PREFIX = '.';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
var SELECTOR_NO_MATCH = 'should_not_match';

var StyleTransformer$1 = new StyleTransformer();

var _createClass$9 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$11(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var infoKey = '__styleInfo';

var StyleInfo = function () {
  _createClass$9(StyleInfo, null, [{
    key: 'get',
    value: function get(node) {
      if (node) {
        return node[infoKey];
      } else {
        return null;
      }
    }
  }, {
    key: 'set',
    value: function set(node, styleInfo) {
      node[infoKey] = styleInfo;
      return styleInfo;
    }
  }]);

  function StyleInfo(ast, placeholder, ownStylePropertyNames, elementName, typeExtension, cssBuild) {
    _classCallCheck$11(this, StyleInfo);

    this.styleRules = ast || null;

    this.placeholder = placeholder || null;

    this.ownStylePropertyNames = ownStylePropertyNames || [];

    this.overrideStyleProperties = null;

    this.elementName = elementName || '';

    this.cssBuild = cssBuild || '';

    this.typeExtension = typeExtension || '';

    this.styleProperties = null;

    this.scopeSelector = null;

    this.customStyle = null;
  }

  _createClass$9(StyleInfo, [{
    key: '_getStyleRules',
    value: function _getStyleRules() {
      return this.styleRules;
    }
  }]);

  return StyleInfo;
}();

StyleInfo.prototype['_getStyleRules'] = StyleInfo.prototype._getStyleRules;

var _createClass$8 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$10(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var matchesSelector$1 = function (p) {
  return p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
}(window.Element.prototype);

var IS_IE = navigator.userAgent.match('Trident');

var XSCOPE_NAME = 'x-scope';

var StyleProperties = function () {
  function StyleProperties() {
    _classCallCheck$10(this, StyleProperties);
  }

  _createClass$8(StyleProperties, [{
    key: 'decorateStyles',
    value: function decorateStyles(rules) {
      var self = this,
          props = {},
          keyframes = [],
          ruleIndex = 0;
      forEachRule(rules, function (rule) {
        self.decorateRule(rule);

        rule.index = ruleIndex++;
        self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
      }, function onKeyframesRule(rule) {
        keyframes.push(rule);
      });

      rules._keyframes = keyframes;

      var names = [];
      for (var i in props) {
        names.push(i);
      }
      return names;
    }
  }, {
    key: 'decorateRule',
    value: function decorateRule(rule) {
      if (rule.propertyInfo) {
        return rule.propertyInfo;
      }
      var info = {},
          properties = {};
      var hasProperties = this.collectProperties(rule, properties);
      if (hasProperties) {
        info.properties = properties;

        rule['rules'] = null;
      }
      info.cssText = this.collectCssText(rule);
      rule.propertyInfo = info;
      return info;
    }
  }, {
    key: 'collectProperties',
    value: function collectProperties(rule, properties) {
      var info = rule.propertyInfo;
      if (info) {
        if (info.properties) {
          Object.assign(properties, info.properties);
          return true;
        }
      } else {
        var m = void 0,
            rx = VAR_ASSIGN;
        var cssText = rule['parsedCssText'];
        var value = void 0;
        var any = void 0;
        while (m = rx.exec(cssText)) {
          value = (m[2] || m[3]).trim();

          if (value !== 'inherit' || value !== 'unset') {
            properties[m[1].trim()] = value;
          }
          any = true;
        }
        return any;
      }
    }
  }, {
    key: 'collectCssText',
    value: function collectCssText(rule) {
      return this.collectConsumingCssText(rule['parsedCssText']);
    }
  }, {
    key: 'collectConsumingCssText',
    value: function collectConsumingCssText(cssText) {
      return cssText.replace(BRACKETED, '').replace(VAR_ASSIGN, '');
    }
  }, {
    key: 'collectPropertiesInCssText',
    value: function collectPropertiesInCssText(cssText, props) {
      var m = void 0;
      while (m = VAR_CONSUMED.exec(cssText)) {
        var name = m[1];

        if (m[2] !== ':') {
          props[name] = true;
        }
      }
    }
  }, {
    key: 'reify',
    value: function reify(props) {
      var names = Object.getOwnPropertyNames(props);
      for (var i = 0, n; i < names.length; i++) {
        n = names[i];
        props[n] = this.valueForProperty(props[n], props);
      }
    }
  }, {
    key: 'valueForProperty',
    value: function valueForProperty(property, props) {
      if (property) {
        if (property.indexOf(';') >= 0) {
          property = this.valueForProperties(property, props);
        } else {
          var self = this;
          var fn = function fn(prefix, value, fallback, suffix) {
            if (!value) {
              return prefix + suffix;
            }
            var propertyValue = self.valueForProperty(props[value], props);

            if (!propertyValue || propertyValue === 'initial') {
              propertyValue = self.valueForProperty(props[fallback] || fallback, props) || fallback;
            } else if (propertyValue === 'apply-shim-inherit') {
              propertyValue = 'inherit';
            }
            return prefix + (propertyValue || '') + suffix;
          };
          property = processVariableAndFallback(property, fn);
        }
      }
      return property && property.trim() || '';
    }
  }, {
    key: 'valueForProperties',
    value: function valueForProperties(property, props) {
      var parts = property.split(';');
      for (var i = 0, p, m; i < parts.length; i++) {
        if (p = parts[i]) {
          MIXIN_MATCH.lastIndex = 0;
          m = MIXIN_MATCH.exec(p);
          if (m) {
            p = this.valueForProperty(props[m[1]], props);
          } else {
            var colon = p.indexOf(':');
            if (colon !== -1) {
              var pp = p.substring(colon);
              pp = pp.trim();
              pp = this.valueForProperty(pp, props) || pp;
              p = p.substring(0, colon) + pp;
            }
          }
          parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
        }
      }
      return parts.join(';');
    }
  }, {
    key: 'applyProperties',
    value: function applyProperties(rule, props) {
      var output = '';

      if (!rule.propertyInfo) {
        this.decorateRule(rule);
      }
      if (rule.propertyInfo.cssText) {
        output = this.valueForProperties(rule.propertyInfo.cssText, props);
      }
      rule['cssText'] = output;
    }
  }, {
    key: 'applyKeyframeTransforms',
    value: function applyKeyframeTransforms(rule, keyframeTransforms) {
      var input = rule['cssText'];
      var output = rule['cssText'];
      if (rule.hasAnimations == null) {
        rule.hasAnimations = ANIMATION_MATCH.test(input);
      }

      if (rule.hasAnimations) {
        var transform = void 0;

        if (rule.keyframeNamesToTransform == null) {
          rule.keyframeNamesToTransform = [];
          for (var keyframe in keyframeTransforms) {
            transform = keyframeTransforms[keyframe];
            output = transform(input);

            if (input !== output) {
              input = output;
              rule.keyframeNamesToTransform.push(keyframe);
            }
          }
        } else {
          for (var i = 0; i < rule.keyframeNamesToTransform.length; ++i) {
            transform = keyframeTransforms[rule.keyframeNamesToTransform[i]];
            input = transform(input);
          }
          output = input;
        }
      }
      rule['cssText'] = output;
    }
  }, {
    key: 'propertyDataFromStyles',
    value: function propertyDataFromStyles(rules, element) {
      var props = {},
          self = this;

      var o = [];

      forEachRule(rules, function (rule) {
        if (!rule.propertyInfo) {
          self.decorateRule(rule);
        }

        var selectorToMatch = rule.transformedSelector || rule['parsedSelector'];
        if (element && rule.propertyInfo.properties && selectorToMatch) {
          if (matchesSelector$1.call(element, selectorToMatch)) {
            self.collectProperties(rule, props);

            addToBitMask(rule.index, o);
          }
        }
      }, null, true);
      return { properties: props, key: o };
    }
  }, {
    key: 'whenHostOrRootRule',
    value: function whenHostOrRootRule(scope, rule, cssBuild, callback) {
      if (!rule.propertyInfo) {
        this.decorateRule(rule);
      }
      if (!rule.propertyInfo.properties) {
        return;
      }

      var _StyleUtil$getIsExten = getIsExtends(scope),
          is = _StyleUtil$getIsExten.is,
          typeExtension = _StyleUtil$getIsExten.typeExtension;

      var hostScope = is ? StyleTransformer$1._calcHostScope(is, typeExtension) : 'html';
      var parsedSelector = rule['parsedSelector'];
      var isRoot = parsedSelector === ':host > *' || parsedSelector === 'html';
      var isHost = parsedSelector.indexOf(':host') === 0 && !isRoot;

      if (cssBuild === 'shady') {
        isRoot = parsedSelector === hostScope + ' > *.' + hostScope || parsedSelector.indexOf('html') !== -1;

        isHost = !isRoot && parsedSelector.indexOf(hostScope) === 0;
      }
      if (cssBuild === 'shadow') {
        isRoot = parsedSelector === ':host > *' || parsedSelector === 'html';
        isHost = isHost && !isRoot;
      }
      if (!isRoot && !isHost) {
        return;
      }
      var selectorToMatch = hostScope;
      if (isHost) {
        if (nativeShadow && !rule.transformedSelector) {
          rule.transformedSelector = StyleTransformer$1._transformRuleCss(rule, StyleTransformer$1._transformComplexSelector, StyleTransformer$1._calcElementScope(is), hostScope);
        }
        selectorToMatch = rule.transformedSelector || hostScope;
      }
      callback({
        selector: selectorToMatch,
        isHost: isHost,
        isRoot: isRoot
      });
    }
  }, {
    key: 'hostAndRootPropertiesForScope',
    value: function hostAndRootPropertiesForScope(scope, rules) {
      var hostProps = {},
          rootProps = {},
          self = this;

      var cssBuild = rules && rules['__cssBuild'];
      forEachRule(rules, function (rule) {
        self.whenHostOrRootRule(scope, rule, cssBuild, function (info) {
          var element = scope._element || scope;
          if (matchesSelector$1.call(element, info.selector)) {
            if (info.isHost) {
              self.collectProperties(rule, hostProps);
            } else {
              self.collectProperties(rule, rootProps);
            }
          }
        });
      }, null, true);
      return { rootProps: rootProps, hostProps: hostProps };
    }
  }, {
    key: 'transformStyles',
    value: function transformStyles(element, properties, scopeSelector) {
      var self = this;

      var _StyleUtil$getIsExten2 = getIsExtends(element),
          is = _StyleUtil$getIsExten2.is,
          typeExtension = _StyleUtil$getIsExten2.typeExtension;

      var hostSelector = StyleTransformer$1._calcHostScope(is, typeExtension);
      var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
      var hostRx = new RegExp(HOST_PREFIX + rxHostSelector + HOST_SUFFIX);
      var rules = StyleInfo.get(element).styleRules;
      var keyframeTransforms = this._elementKeyframeTransforms(element, rules, scopeSelector);
      return StyleTransformer$1.elementStyles(element, rules, function (rule) {
        self.applyProperties(rule, properties);
        if (!nativeShadow && !isKeyframesSelector(rule) && rule['cssText']) {
          self.applyKeyframeTransforms(rule, keyframeTransforms);
          self._scopeSelector(rule, hostRx, hostSelector, scopeSelector);
        }
      });
    }
  }, {
    key: '_elementKeyframeTransforms',
    value: function _elementKeyframeTransforms(element, rules, scopeSelector) {
      var keyframesRules = rules._keyframes;
      var keyframeTransforms = {};
      if (!nativeShadow && keyframesRules) {
        for (var i = 0, keyframesRule = keyframesRules[i]; i < keyframesRules.length; keyframesRule = keyframesRules[++i]) {
          this._scopeKeyframes(keyframesRule, scopeSelector);
          keyframeTransforms[keyframesRule['keyframesName']] = this._keyframesRuleTransformer(keyframesRule);
        }
      }
      return keyframeTransforms;
    }
  }, {
    key: '_keyframesRuleTransformer',
    value: function _keyframesRuleTransformer(keyframesRule) {
      return function (cssText) {
        return cssText.replace(keyframesRule.keyframesNameRx, keyframesRule.transformedKeyframesName);
      };
    }
  }, {
    key: '_scopeKeyframes',
    value: function _scopeKeyframes(rule, scopeId) {
      rule.keyframesNameRx = new RegExp(rule['keyframesName'], 'g');
      rule.transformedKeyframesName = rule['keyframesName'] + '-' + scopeId;
      rule.transformedSelector = rule.transformedSelector || rule['selector'];
      rule['selector'] = rule.transformedSelector.replace(rule['keyframesName'], rule.transformedKeyframesName);
    }
  }, {
    key: '_scopeSelector',
    value: function _scopeSelector(rule, hostRx, hostSelector, scopeId) {
      rule.transformedSelector = rule.transformedSelector || rule['selector'];
      var selector = rule.transformedSelector;
      var scope = '.' + scopeId;
      var parts = selector.split(',');
      for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
        parts[i] = p.match(hostRx) ? p.replace(hostSelector, scope) : scope + ' ' + p;
      }
      rule['selector'] = parts.join(',');
    }
  }, {
    key: 'applyElementScopeSelector',
    value: function applyElementScopeSelector(element, selector, old) {
      var c = element.getAttribute('class') || '';
      var v = c;
      if (old) {
        v = c.replace(new RegExp('\\s*' + XSCOPE_NAME + '\\s*' + old + '\\s*', 'g'), ' ');
      }
      v += (v ? ' ' : '') + XSCOPE_NAME + ' ' + selector;
      if (c !== v) {
        setElementClassRaw(element, v);
      }
    }
  }, {
    key: 'applyElementStyle',
    value: function applyElementStyle(element, properties, selector, style) {
      var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);

      var styleInfo = StyleInfo.get(element);
      var s = styleInfo.customStyle;
      if (s && !nativeShadow && s !== style) {
        s['_useCount']--;
        if (s['_useCount'] <= 0 && s.parentNode) {
          s.parentNode.removeChild(s);
        }
      }

      if (nativeShadow) {
        if (styleInfo.customStyle) {
          styleInfo.customStyle.textContent = cssText;
          style = styleInfo.customStyle;
        } else if (cssText) {
          style = applyCss(cssText, selector, element.shadowRoot, styleInfo.placeholder);
        }
      } else {
        if (!style) {
          if (cssText) {
            style = applyCss(cssText, selector, null, styleInfo.placeholder);
          }
        } else if (!style.parentNode) {
          if (IS_IE && cssText.indexOf('@media') > -1) {
            style.textContent = cssText;
          }
          applyStyle(style, null, styleInfo.placeholder);
        }
      }

      if (style) {
        style['_useCount'] = style['_useCount'] || 0;

        if (styleInfo.customStyle != style) {
          style['_useCount']++;
        }
        styleInfo.customStyle = style;
      }
      return style;
    }
  }, {
    key: 'applyCustomStyle',
    value: function applyCustomStyle(style, properties) {
      var rules = rulesForStyle(style);
      var self = this;
      style.textContent = toCssText(rules, function (rule) {
        var css = rule['cssText'] = rule['parsedCssText'];
        if (rule.propertyInfo && rule.propertyInfo.cssText) {
          css = removeCustomPropAssignment(css);

          rule['cssText'] = self.valueForProperties(css, properties);
        }
      });
    }
  }, {
    key: 'XSCOPE_NAME',
    get: function get() {
      return XSCOPE_NAME;
    }
  }]);

  return StyleProperties;
}();

function addToBitMask(n, bits) {
  var o = parseInt(n / 32, 10);
  var v = 1 << n % 32;
  bits[o] = (bits[o] || 0) | v;
}

var StyleProperties$1 = new StyleProperties();

var placeholderMap = {};

var ce = window['customElements'];
if (ce && !nativeShadow) {
  var origDefine = ce['define'];

  var wrappedDefine = function wrappedDefine(name, clazz, options) {
    placeholderMap[name] = applyStylePlaceHolder(name);
    return origDefine.call(ce, name, clazz, options);
  };
  ce['define'] = wrappedDefine;
}

var _createClass$10 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$12(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StyleCache = function () {
  function StyleCache() {
    var typeMax = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 100;

    _classCallCheck$12(this, StyleCache);

    this.cache = {};
    this.typeMax = typeMax;
  }

  _createClass$10(StyleCache, [{
    key: '_validate',
    value: function _validate(cacheEntry, properties, ownPropertyNames) {
      for (var idx = 0; idx < ownPropertyNames.length; idx++) {
        var pn = ownPropertyNames[idx];
        if (cacheEntry.properties[pn] !== properties[pn]) {
          return false;
        }
      }
      return true;
    }
  }, {
    key: 'store',
    value: function store(tagname, properties, styleElement, scopeSelector) {
      var list = this.cache[tagname] || [];
      list.push({ properties: properties, styleElement: styleElement, scopeSelector: scopeSelector });
      if (list.length > this.typeMax) {
        list.shift();
      }
      this.cache[tagname] = list;
    }
  }, {
    key: 'fetch',
    value: function fetch(tagname, properties, ownPropertyNames) {
      var list = this.cache[tagname];
      if (!list) {
        return;
      }

      for (var idx = list.length - 1; idx >= 0; idx--) {
        var entry = list[idx];
        if (this._validate(entry, properties, ownPropertyNames)) {
          return entry;
        }
      }
    }
  }]);

  return StyleCache;
}();

var flush$2 = function flush() {};

function getClasses(element) {
  var classes = [];
  if (element.classList) {
    classes = Array.from(element.classList);
  } else if (element instanceof window['SVGElement'] && element.hasAttribute('class')) {
    classes = element.getAttribute('class').split(/\s+/);
  }
  return classes;
}

function getCurrentScope(element) {
  var classes = getClasses(element);
  var idx = classes.indexOf(StyleTransformer$1.SCOPE_NAME);
  if (idx > -1) {
    return classes[idx + 1];
  }
  return '';
}

function handler(mxns) {
  for (var x = 0; x < mxns.length; x++) {
    var mxn = mxns[x];
    if (mxn.target === document.documentElement || mxn.target === document.head) {
      continue;
    }
    for (var i = 0; i < mxn.addedNodes.length; i++) {
      var n = mxn.addedNodes[i];
      if (n.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      n = n;
      var root = n.getRootNode();
      var currentScope = getCurrentScope(n);

      if (currentScope && root === n.ownerDocument) {
        StyleTransformer$1.dom(n, currentScope, true);
      } else if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        var newScope = void 0;
        var host = root.host;

        if (!host) {
          continue;
        }
        newScope = getIsExtends(host).is;
        if (currentScope === newScope) {
          var unscoped = window['ShadyDOM']['nativeMethods']['querySelectorAll'].call(n, ':not(.' + StyleTransformer$1.SCOPE_NAME + ')');
          for (var j = 0; j < unscoped.length; j++) {
            StyleTransformer$1.element(unscoped[j], currentScope);
          }
          continue;
        }
        if (currentScope) {
          StyleTransformer$1.dom(n, currentScope, true);
        }
        StyleTransformer$1.dom(n, newScope);
      }
    }
  }
}

if (!nativeShadow) {
  var observer = new MutationObserver(handler);
  var start = function start(node) {
    observer.observe(node, { childList: true, subtree: true });
  };
  var nativeCustomElements = window['customElements'] && !window['customElements']['polyfillWrapFlushCallback'];

  if (nativeCustomElements) {
    start(document);
  } else {
    var delayedStart = function delayedStart() {
      start(document.body);
    };

    if (window['HTMLImports']) {
      window['HTMLImports']['whenReady'](delayedStart);
    } else {
      requestAnimationFrame(function () {
        if (document.readyState === 'loading') {
          var listener = function listener() {
            delayedStart();
            document.removeEventListener('readystatechange', listener);
          };
          document.addEventListener('readystatechange', listener);
        } else {
          delayedStart();
        }
      });
    }
  }

  flush$2 = function flush() {
    handler(observer.takeRecords());
  };
}

var templateMap = {};

var CURRENT_VERSION = '_applyShimCurrentVersion';

var NEXT_VERSION = '_applyShimNextVersion';

var VALIDATING_VERSION = '_applyShimValidatingVersion';

var promise = Promise.resolve();

function invalidate(elementName) {
  var template = templateMap[elementName];
  if (template) {
    invalidateTemplate(template);
  }
}

function invalidateTemplate(template) {
  template[CURRENT_VERSION] = template[CURRENT_VERSION] || 0;

  template[VALIDATING_VERSION] = template[VALIDATING_VERSION] || 0;

  template[NEXT_VERSION] = (template[NEXT_VERSION] || 0) + 1;
}



function templateIsValid(template) {
  return template[CURRENT_VERSION] === template[NEXT_VERSION];
}



function templateIsValidating(template) {
  return !templateIsValid(template) && template[VALIDATING_VERSION] === template[NEXT_VERSION];
}



function startValidatingTemplate(template) {
  template[VALIDATING_VERSION] = template[NEXT_VERSION];

  if (!template._validating) {
    template._validating = true;
    promise.then(function () {
      template[CURRENT_VERSION] = template[NEXT_VERSION];
      template._validating = false;
    });
  }
}

var readyPromise = null;

var whenReady = window['HTMLImports'] && window['HTMLImports']['whenReady'] || null;

var resolveFn = void 0;

function documentWait(callback) {
  requestAnimationFrame(function () {
    if (whenReady) {
      whenReady(callback);
    } else {
      if (!readyPromise) {
        readyPromise = new Promise(function (resolve) {
          resolveFn = resolve;
        });
        if (document.readyState === 'complete') {
          resolveFn();
        } else {
          document.addEventListener('readystatechange', function () {
            if (document.readyState === 'complete') {
              resolveFn();
            }
          });
        }
      }
      readyPromise.then(function () {
        callback && callback();
      });
    }
  });
}

function updateNativeProperties(element, properties) {
  for (var p in properties) {
    if (p === null) {
      element.style.removeProperty(p);
    } else {
      element.style.setProperty(p, properties[p]);
    }
  }
}



function detectMixin(cssText) {
  var has = MIXIN_MATCH.test(cssText) || VAR_ASSIGN.test(cssText);

  MIXIN_MATCH.lastIndex = 0;
  VAR_ASSIGN.lastIndex = 0;
  return has;
}

var _createClass$11 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$13(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }



var SEEN_MARKER = '__seenByShadyCSS';
var CACHED_STYLE = '__shadyCSSCachedStyle';

var transformFn = null;

var validateFn = null;

var CustomStyleInterface$1 = function () {
  function CustomStyleInterface() {
    _classCallCheck$13(this, CustomStyleInterface);

    this['customStyles'] = [];
    this['enqueued'] = false;
  }

  _createClass$11(CustomStyleInterface, [{
    key: 'enqueueDocumentValidation',
    value: function enqueueDocumentValidation() {
      if (this['enqueued'] || !validateFn) {
        return;
      }
      this['enqueued'] = true;
      documentWait(validateFn);
    }
  }, {
    key: 'addCustomStyle',
    value: function addCustomStyle(style) {
      if (!style[SEEN_MARKER]) {
        style[SEEN_MARKER] = true;
        this['customStyles'].push(style);
        this.enqueueDocumentValidation();
      }
    }
  }, {
    key: 'getStyleForCustomStyle',
    value: function getStyleForCustomStyle(customStyle) {
      if (customStyle[CACHED_STYLE]) {
        return customStyle[CACHED_STYLE];
      }
      var style = void 0;
      if (customStyle['getStyle']) {
        style = customStyle['getStyle']();
      } else {
        style = customStyle;
      }
      return style;
    }
  }, {
    key: 'processStyles',
    value: function processStyles() {
      var cs = this['customStyles'];
      for (var i = 0; i < cs.length; i++) {
        var customStyle = cs[i];
        if (customStyle[CACHED_STYLE]) {
          continue;
        }
        var style = this.getStyleForCustomStyle(customStyle);
        if (style) {
          var styleToTransform = style['__appliedElement'] || style;
          if (transformFn) {
            transformFn(styleToTransform);
          }
          customStyle[CACHED_STYLE] = styleToTransform;
        }
      }
      return cs;
    }
  }]);

  return CustomStyleInterface;
}();

CustomStyleInterface$1.prototype['addCustomStyle'] = CustomStyleInterface$1.prototype.addCustomStyle;
CustomStyleInterface$1.prototype['getStyleForCustomStyle'] = CustomStyleInterface$1.prototype.getStyleForCustomStyle;
CustomStyleInterface$1.prototype['processStyles'] = CustomStyleInterface$1.prototype.processStyles;

Object.defineProperties(CustomStyleInterface$1.prototype, {
  'transformCallback': {
    get: function get() {
      return transformFn;
    },
    set: function set(fn) {
      transformFn = fn;
    }
  },
  'validateCallback': {
    get: function get() {
      return validateFn;
    },
    set: function set(fn) {
      var needsEnqueue = false;
      if (!validateFn) {
        needsEnqueue = true;
      }
      validateFn = fn;
      if (needsEnqueue) {
        this.enqueueDocumentValidation();
      }
    }
  }
});

var _createClass$6 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$7(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var styleCache = new StyleCache();

var ScopingShim = function () {
  function ScopingShim() {
    var _this = this;

    _classCallCheck$7(this, ScopingShim);

    this._scopeCounter = {};
    this._documentOwner = document.documentElement;
    var ast = new StyleNode();
    ast['rules'] = [];
    this._documentOwnerStyleInfo = StyleInfo.set(this._documentOwner, new StyleInfo(ast));
    this._elementsHaveApplied = false;
    this._applyShim = null;

    this._customStyleInterface = null;
    documentWait(function () {
      _this._ensure();
    });
  }

  _createClass$6(ScopingShim, [{
    key: 'flush',
    value: function flush() {
      flush$2();
    }
  }, {
    key: '_generateScopeSelector',
    value: function _generateScopeSelector(name) {
      var id = this._scopeCounter[name] = (this._scopeCounter[name] || 0) + 1;
      return name + '-' + id;
    }
  }, {
    key: 'getStyleAst',
    value: function getStyleAst(style) {
      return rulesForStyle(style);
    }
  }, {
    key: 'styleAstToString',
    value: function styleAstToString(ast) {
      return toCssText(ast);
    }
  }, {
    key: '_gatherStyles',
    value: function _gatherStyles(template) {
      return gatherStyleText(template.content);
    }
  }, {
    key: '_getCssBuild',
    value: function _getCssBuild(template) {
      var style = template.content.querySelector('style');
      if (!style) {
        return '';
      }
      return style.getAttribute('css-build') || '';
    }
  }, {
    key: 'prepareTemplate',
    value: function prepareTemplate(template, elementName, typeExtension) {
      if (template._prepared) {
        return;
      }
      template._prepared = true;
      template.name = elementName;
      template.extends = typeExtension;
      templateMap[elementName] = template;
      var cssBuild = this._getCssBuild(template);
      var cssText = this._gatherStyles(template);
      var info = {
        is: elementName,
        extends: typeExtension,
        __cssBuild: cssBuild
      };
      if (!nativeShadow) {
        StyleTransformer$1.dom(template.content, elementName);
      }

      this._ensure();
      var hasMixins = detectMixin(cssText);
      var ast = parse(cssText);

      if (hasMixins && nativeCssVariables && this._applyShim) {
        this._applyShim['transformRules'](ast, elementName);
      }
      template['_styleAst'] = ast;
      template._cssBuild = cssBuild;

      var ownPropertyNames = [];
      if (!nativeCssVariables) {
        ownPropertyNames = StyleProperties$1.decorateStyles(template['_styleAst'], info);
      }
      if (!ownPropertyNames.length || nativeCssVariables) {
        var root = nativeShadow ? template.content : null;
        var placeholder = placeholderMap[elementName];
        var style = this._generateStaticStyle(info, template['_styleAst'], root, placeholder);
        template._style = style;
      }
      template._ownPropertyNames = ownPropertyNames;
    }
  }, {
    key: '_generateStaticStyle',
    value: function _generateStaticStyle(info, rules, shadowroot, placeholder) {
      var cssText = StyleTransformer$1.elementStyles(info, rules);
      if (cssText.length) {
        return applyCss(cssText, info.is, shadowroot, placeholder);
      }
    }
  }, {
    key: '_prepareHost',
    value: function _prepareHost(host) {
      var _StyleUtil$getIsExten = getIsExtends(host),
          is = _StyleUtil$getIsExten.is,
          typeExtension = _StyleUtil$getIsExten.typeExtension;

      var placeholder = placeholderMap[is];
      var template = templateMap[is];
      var ast = void 0;
      var ownStylePropertyNames = void 0;
      var cssBuild = void 0;
      if (template) {
        ast = template['_styleAst'];
        ownStylePropertyNames = template._ownPropertyNames;
        cssBuild = template._cssBuild;
      }
      return StyleInfo.set(host, new StyleInfo(ast, placeholder, ownStylePropertyNames, is, typeExtension, cssBuild));
    }
  }, {
    key: '_ensureApplyShim',
    value: function _ensureApplyShim() {
      if (this._applyShim) {
        return;
      } else if (window.ShadyCSS && window.ShadyCSS.ApplyShim) {
        this._applyShim = window.ShadyCSS.ApplyShim;
        this._applyShim['invalidCallback'] = invalidate;
      }
    }
  }, {
    key: '_ensureCustomStyleInterface',
    value: function _ensureCustomStyleInterface() {
      var _this2 = this;

      if (this._customStyleInterface) {
        return;
      } else if (window.ShadyCSS && window.ShadyCSS.CustomStyleInterface) {
        this._customStyleInterface = window.ShadyCSS.CustomStyleInterface;

        this._customStyleInterface['transformCallback'] = function (style) {
          _this2.transformCustomStyleForDocument(style);
        };
        this._customStyleInterface['validateCallback'] = function () {
          requestAnimationFrame(function () {
            if (_this2._customStyleInterface['enqueued'] || _this2._elementsHaveApplied) {
              _this2.flushCustomStyles();
            }
          });
        };
      }
    }
  }, {
    key: '_ensure',
    value: function _ensure() {
      this._ensureApplyShim();
      this._ensureCustomStyleInterface();
    }
  }, {
    key: 'flushCustomStyles',
    value: function flushCustomStyles() {
      this._ensure();
      if (!this._customStyleInterface) {
        return;
      }
      var customStyles = this._customStyleInterface['processStyles']();

      if (!this._customStyleInterface['enqueued']) {
        return;
      }
      if (!nativeCssVariables) {
        this._updateProperties(this._documentOwner, this._documentOwnerStyleInfo);
        this._applyCustomStyles(customStyles);
      } else {
        this._revalidateCustomStyleApplyShim(customStyles);
      }
      this._customStyleInterface['enqueued'] = false;

      if (this._elementsHaveApplied && !nativeCssVariables) {
        this.styleDocument();
      }
    }
  }, {
    key: 'styleElement',
    value: function styleElement(host, overrideProps) {
      var _StyleUtil$getIsExten2 = getIsExtends(host),
          is = _StyleUtil$getIsExten2.is;

      var styleInfo = StyleInfo.get(host);
      if (!styleInfo) {
        styleInfo = this._prepareHost(host);
      }

      if (!this._isRootOwner(host)) {
        this._elementsHaveApplied = true;
      }
      if (overrideProps) {
        styleInfo.overrideStyleProperties = styleInfo.overrideStyleProperties || {};
        Object.assign(styleInfo.overrideStyleProperties, overrideProps);
      }
      if (!nativeCssVariables) {
        this._updateProperties(host, styleInfo);
        if (styleInfo.ownStylePropertyNames && styleInfo.ownStylePropertyNames.length) {
          this._applyStyleProperties(host, styleInfo);
        }
      } else {
        if (styleInfo.overrideStyleProperties) {
          updateNativeProperties(host, styleInfo.overrideStyleProperties);
        }
        var template = templateMap[is];

        if (!template && !this._isRootOwner(host)) {
          return;
        }
        if (template && template._style && !templateIsValid(template)) {
          if (!templateIsValidating(template)) {
            this._ensure();
            this._applyShim && this._applyShim['transformRules'](template['_styleAst'], is);
            template._style.textContent = StyleTransformer$1.elementStyles(host, styleInfo.styleRules);
            startValidatingTemplate(template);
          }

          if (nativeShadow) {
            var root = host.shadowRoot;
            if (root) {
              var style = root.querySelector('style');
              style.textContent = StyleTransformer$1.elementStyles(host, styleInfo.styleRules);
            }
          }
          styleInfo.styleRules = template['_styleAst'];
        }
      }
    }
  }, {
    key: '_styleOwnerForNode',
    value: function _styleOwnerForNode(node) {
      var root = node.getRootNode();
      var host = root.host;
      if (host) {
        if (StyleInfo.get(host)) {
          return host;
        } else {
          return this._styleOwnerForNode(host);
        }
      }
      return this._documentOwner;
    }
  }, {
    key: '_isRootOwner',
    value: function _isRootOwner(node) {
      return node === this._documentOwner;
    }
  }, {
    key: '_applyStyleProperties',
    value: function _applyStyleProperties(host, styleInfo) {
      var is = getIsExtends(host).is;
      var cacheEntry = styleCache.fetch(is, styleInfo.styleProperties, styleInfo.ownStylePropertyNames);
      var cachedScopeSelector = cacheEntry && cacheEntry.scopeSelector;
      var cachedStyle = cacheEntry ? cacheEntry.styleElement : null;
      var oldScopeSelector = styleInfo.scopeSelector;

      styleInfo.scopeSelector = cachedScopeSelector || this._generateScopeSelector(is);
      var style = StyleProperties$1.applyElementStyle(host, styleInfo.styleProperties, styleInfo.scopeSelector, cachedStyle);
      if (!nativeShadow) {
        StyleProperties$1.applyElementScopeSelector(host, styleInfo.scopeSelector, oldScopeSelector);
      }
      if (!cacheEntry) {
        styleCache.store(is, styleInfo.styleProperties, style, styleInfo.scopeSelector);
      }
      return style;
    }
  }, {
    key: '_updateProperties',
    value: function _updateProperties(host, styleInfo) {
      var owner = this._styleOwnerForNode(host);
      var ownerStyleInfo = StyleInfo.get(owner);
      var ownerProperties = ownerStyleInfo.styleProperties;
      var props = Object.create(ownerProperties || null);
      var hostAndRootProps = StyleProperties$1.hostAndRootPropertiesForScope(host, styleInfo.styleRules);
      var propertyData = StyleProperties$1.propertyDataFromStyles(ownerStyleInfo.styleRules, host);
      var propertiesMatchingHost = propertyData.properties;
      Object.assign(props, hostAndRootProps.hostProps, propertiesMatchingHost, hostAndRootProps.rootProps);
      this._mixinOverrideStyles(props, styleInfo.overrideStyleProperties);
      StyleProperties$1.reify(props);
      styleInfo.styleProperties = props;
    }
  }, {
    key: '_mixinOverrideStyles',
    value: function _mixinOverrideStyles(props, overrides) {
      for (var p in overrides) {
        var v = overrides[p];

        if (v || v === 0) {
          props[p] = v;
        }
      }
    }
  }, {
    key: 'styleDocument',
    value: function styleDocument(properties) {
      this.styleSubtree(this._documentOwner, properties);
    }
  }, {
    key: 'styleSubtree',
    value: function styleSubtree(host, properties) {
      var root = host.shadowRoot;
      if (root || this._isRootOwner(host)) {
        this.styleElement(host, properties);
      }

      var shadowChildren = root && (root.children || root.childNodes);
      if (shadowChildren) {
        for (var i = 0; i < shadowChildren.length; i++) {
          var c = shadowChildren[i];
          this.styleSubtree(c);
        }
      } else {
        var children = host.children || host.childNodes;
        if (children) {
          for (var _i = 0; _i < children.length; _i++) {
            var _c = children[_i];
            this.styleSubtree(_c);
          }
        }
      }
    }
  }, {
    key: '_revalidateCustomStyleApplyShim',
    value: function _revalidateCustomStyleApplyShim(customStyles) {
      for (var i = 0; i < customStyles.length; i++) {
        var c = customStyles[i];
        var s = this._customStyleInterface['getStyleForCustomStyle'](c);
        if (s) {
          this._revalidateApplyShim(s);
        }
      }
    }
  }, {
    key: '_applyCustomStyles',
    value: function _applyCustomStyles(customStyles) {
      for (var i = 0; i < customStyles.length; i++) {
        var c = customStyles[i];
        var s = this._customStyleInterface['getStyleForCustomStyle'](c);
        if (s) {
          StyleProperties$1.applyCustomStyle(s, this._documentOwnerStyleInfo.styleProperties);
        }
      }
    }
  }, {
    key: 'transformCustomStyleForDocument',
    value: function transformCustomStyleForDocument(style) {
      var _this3 = this;

      var ast = rulesForStyle(style);
      forEachRule(ast, function (rule) {
        if (nativeShadow) {
          StyleTransformer$1.normalizeRootSelector(rule);
        } else {
          StyleTransformer$1.documentRule(rule);
        }
        if (nativeCssVariables) {
          _this3._ensure();
          _this3._applyShim && _this3._applyShim['transformRule'](rule);
        }
      });
      if (nativeCssVariables) {
        style.textContent = toCssText(ast);
      } else {
        this._documentOwnerStyleInfo.styleRules.rules.push(ast);
      }
    }
  }, {
    key: '_revalidateApplyShim',
    value: function _revalidateApplyShim(style) {
      if (nativeCssVariables && this._applyShim) {
        var ast = rulesForStyle(style);
        this._ensure();
        this._applyShim['transformRules'](ast);
        style.textContent = toCssText(ast);
      }
    }
  }, {
    key: 'getComputedStyleValue',
    value: function getComputedStyleValue$$1(element, property) {
      var value = void 0;
      if (!nativeCssVariables) {
        var styleInfo = StyleInfo.get(element) || StyleInfo.get(this._styleOwnerForNode(element));
        value = styleInfo.styleProperties[property];
      }

      value = value || window.getComputedStyle(element).getPropertyValue(property);

      return value ? value.trim() : '';
    }
  }, {
    key: 'setElementClass',
    value: function setElementClass(element, classString) {
      var root = element.getRootNode();
      var classes = classString ? classString.split(/\s/) : [];
      var scopeName = root.host && root.host.localName;

      if (!scopeName) {
        var classAttr = element.getAttribute('class');
        if (classAttr) {
          var k$ = classAttr.split(/\s/);
          for (var i = 0; i < k$.length; i++) {
            if (k$[i] === StyleTransformer$1.SCOPE_NAME) {
              scopeName = k$[i + 1];
              break;
            }
          }
        }
      }
      if (scopeName) {
        classes.push(StyleTransformer$1.SCOPE_NAME, scopeName);
      }
      if (!nativeCssVariables) {
        var styleInfo = StyleInfo.get(element);
        if (styleInfo && styleInfo.scopeSelector) {
          classes.push(StyleProperties$1.XSCOPE_NAME, styleInfo.scopeSelector);
        }
      }
      setElementClassRaw(element, classes.join(' '));
    }
  }, {
    key: '_styleInfoForNode',
    value: function _styleInfoForNode(node) {
      return StyleInfo.get(node);
    }
  }]);

  return ScopingShim;
}();

ScopingShim.prototype['flush'] = ScopingShim.prototype.flush;
ScopingShim.prototype['prepareTemplate'] = ScopingShim.prototype.prepareTemplate;
ScopingShim.prototype['styleElement'] = ScopingShim.prototype.styleElement;
ScopingShim.prototype['styleDocument'] = ScopingShim.prototype.styleDocument;
ScopingShim.prototype['styleSubtree'] = ScopingShim.prototype.styleSubtree;
ScopingShim.prototype['getComputedStyleValue'] = ScopingShim.prototype.getComputedStyleValue;
ScopingShim.prototype['setElementClass'] = ScopingShim.prototype.setElementClass;
ScopingShim.prototype['_styleInfoForNode'] = ScopingShim.prototype._styleInfoForNode;
ScopingShim.prototype['transformCustomStyleForDocument'] = ScopingShim.prototype.transformCustomStyleForDocument;
ScopingShim.prototype['getStyleAst'] = ScopingShim.prototype.getStyleAst;
ScopingShim.prototype['styleAstToString'] = ScopingShim.prototype.styleAstToString;
ScopingShim.prototype['flushCustomStyles'] = ScopingShim.prototype.flushCustomStyles;
Object.defineProperties(ScopingShim.prototype, {
  'nativeShadow': {
    get: function get() {
      return nativeShadow;
    }
  },
  'nativeCss': {
    get: function get() {
      return nativeCssVariables;
    }
  }
});

var scopingShim$1 = new ScopingShim();

var ApplyShim = void 0;
var CustomStyleInterface = void 0;

if (window['ShadyCSS']) {
  ApplyShim = window['ShadyCSS']['ApplyShim'];
  CustomStyleInterface = window['ShadyCSS']['CustomStyleInterface'];
}

window.ShadyCSS = {
  ScopingShim: scopingShim$1,
  prepareTemplate: function prepareTemplate(template, elementName, elementExtends) {
    scopingShim$1.flushCustomStyles();
    scopingShim$1.prepareTemplate(template, elementName, elementExtends);
  },
  styleSubtree: function styleSubtree(element, properties) {
    scopingShim$1.flushCustomStyles();
    scopingShim$1.styleSubtree(element, properties);
  },
  styleElement: function styleElement(element) {
    scopingShim$1.flushCustomStyles();
    scopingShim$1.styleElement(element);
  },
  styleDocument: function styleDocument(properties) {
    scopingShim$1.flushCustomStyles();
    scopingShim$1.styleDocument(properties);
  },
  getComputedStyleValue: function getComputedStyleValue(element, property) {
    return scopingShim$1.getComputedStyleValue(element, property);
  },


  nativeCss: nativeCssVariables,

  nativeShadow: nativeShadow
};

if (ApplyShim) {
  window.ShadyCSS.ApplyShim = ApplyShim;
}

if (CustomStyleInterface) {
  window.ShadyCSS.CustomStyleInterface = CustomStyleInterface;
}

var customElements$1 = window['customElements'];
var HTMLImports = window['HTMLImports'];
var Template = window['HTMLTemplateElement'];

window.WebComponents = window.WebComponents || {};

if (customElements$1 && customElements$1['polyfillWrapFlushCallback']) {
  var flushCallback = void 0;
  var runAndClearCallback = function runAndClearCallback() {
    if (flushCallback) {
      if (Template.bootstrap) {
        Template.bootstrap(window.document);
      }
      var cb = flushCallback;
      flushCallback = null;
      cb();
      return true;
    }
  };
  var origWhenReady = HTMLImports['whenReady'];
  customElements$1['polyfillWrapFlushCallback'](function (cb) {
    flushCallback = cb;
    origWhenReady(runAndClearCallback);
  });

  HTMLImports['whenReady'] = function (cb) {
    origWhenReady(function () {
      if (runAndClearCallback()) {
        HTMLImports['whenReady'](cb);
      } else {
        cb();
      }
    });
  };
}

HTMLImports['whenReady'](function () {
  requestAnimationFrame(function () {
    window.WebComponents.ready = true;
    document.dispatchEvent(new CustomEvent('WebComponentsReady', { bubbles: true }));
  });
});

var style = document.createElement('style');
style.textContent = '' + 'body {' + 'transition: opacity ease-in 0.2s;' + ' } \n' + 'body[unresolved] {' + 'opacity: 0; display: block; overflow: hidden; position: relative;' + ' } \n';
var head = document.querySelector('head');
head.insertBefore(style, head.firstChild);

}());
