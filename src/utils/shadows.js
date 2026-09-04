/**
 * Three.js 0.160 defines castShadow/receiveShadow via class fields.
 * Safari/WebKit treats those as readonly for external assignment.
 */
export function setShadow(object, cast = false, receive = false) {
  if (cast) {
    Object.defineProperty(object, 'castShadow', {
      value: true,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  if (receive) {
    Object.defineProperty(object, 'receiveShadow', {
      value: true,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  return object;
}
