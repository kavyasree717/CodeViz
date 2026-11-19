
import { getPrimitiveNumber } from '../shared/runtimeUtils';

export function getArrayAccesses(code) {
  const accesses = [];

  const pattern =
    /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\[\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\]/g;

  let match;

  while ((match = pattern.exec(code || '')) !== null) {
    accesses.push({
      arrayName: match[1],
      indexName: match[2],
    });
  }

  return accesses;
}

export function getPointersForArray(arrayName, variables, code) {
  const accesses = getArrayAccesses(code || '');
  const pointerNames = new Set();

  accesses
    .filter(access => access.arrayName === arrayName)
    .forEach(access => pointerNames.add(access.indexName));

  const midpointNames = [...pointerNames].filter(name =>
    /mid|middle/i.test(name)
  );

  if (midpointNames.length > 0) {
    const assignmentPattern =
      /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*([^;]+);?/g;

    let match;

    while ((match = assignmentPattern.exec(code || '')) !== null) {
      const updatedVariable = match[1];
      const rightHandSide = match[2];

      const usesMidpointArithmetic = midpointNames.some(name => {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        return new RegExp(
          `\\b${escaped}\\b\\s*[+-]\\s*\\d+`
        ).test(rightHandSide);
      });

      if (usesMidpointArithmetic && updatedVariable !== arrayName) {
        pointerNames.add(updatedVariable);
      }
    }

    const boundaryNames = [
      'left',
      'right',
      'low',
      'high',
      'start',
      'end',
    ];

    boundaryNames.forEach(name => {
      const actualName = Object.keys(variables || {}).find(
        variableName => variableName.toLowerCase() === name
      );

      if (actualName) pointerNames.add(actualName);
    });
  }

  const pointers = [...pointerNames]
    .map(name => ({
      name,
      index: getPrimitiveNumber(variables?.[name]),
    }))
    .filter(pointer => pointer.index !== null);

  const getOrder = name => {
    if (/left|low|start/i.test(name)) return 1;
    if (/mid|middle/i.test(name)) return 2;
    if (/right|high|end/i.test(name)) return 3;
    return 4;
  };

  pointers.sort((a, b) => getOrder(a.name) - getOrder(b.name));

  return pointers;
}
