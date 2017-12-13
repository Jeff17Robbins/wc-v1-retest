(function () {
'use strict';

(() => {
  'use strict';

  if (!window.customElements) return;

  const NativeHTMLElement = window.HTMLElement;
  const nativeDefine = window.customElements.define;
  const nativeGet = window.customElements.get;

  const tagnameByConstructor = new Map();

  const constructorByTagname = new Map();

  let browserConstruction = false;

  let userConstruction = false;

  window.HTMLElement = function () {
    if (!browserConstruction) {
      const tagname = tagnameByConstructor.get(this.constructor);
      const fakeClass = nativeGet.call(window.customElements, tagname);

      userConstruction = true;
      const instance = new fakeClass();
      return instance;
    }

    browserConstruction = false;
  };

  window.HTMLElement.prototype = NativeHTMLElement.prototype;

  const define = (tagname, elementClass) => {
    const elementProto = elementClass.prototype;
    const StandInElement = class extends NativeHTMLElement {
      constructor() {
        super();

        Object.setPrototypeOf(this, elementProto);

        if (!userConstruction) {
          browserConstruction = true;

          elementClass.call(this);
        }
        userConstruction = false;
      }
    };
    const standInProto = StandInElement.prototype;
    StandInElement.observedAttributes = elementClass.observedAttributes;
    standInProto.connectedCallback = elementProto.connectedCallback;
    standInProto.disconnectedCallback = elementProto.disconnectedCallback;
    standInProto.attributeChangedCallback = elementProto.attributeChangedCallback;
    standInProto.adoptedCallback = elementProto.adoptedCallback;

    tagnameByConstructor.set(elementClass, tagname);
    constructorByTagname.set(tagname, elementClass);
    nativeDefine.call(window.customElements, tagname, StandInElement);
  };

  const get = tagname => constructorByTagname.get(tagname);

  Object.defineProperty(window, 'customElements', { value: window.customElements, configurable: true, writable: true });
  Object.defineProperty(window.customElements, 'define', { value: define, configurable: true, writable: true });
  Object.defineProperty(window.customElements, 'get', { value: get, configurable: true, writable: true });
})();

}());
