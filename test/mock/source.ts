import { Observable, from, of } from "rxjs";
import { concatMap, delay } from "rxjs/operators";

import { AntConfig, AntResultDefinition, AntSourceDefinition, AntSourceEvent } from "../../src/index";

interface Product {
  id: number;
  symbol: string;
  parameters: number[];
}

interface Parameter {
  id: number;
  name: string;
  unit: string;
}

interface Value {
  id: number;
  value: any;
  parameter_id: number;
}

interface MyAppConfig {
  useProducts: boolean;
}

const myAppConfig: MyAppConfig  = {
  useProducts: true
};

const shuffleArray = <T>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const productsToMock: Product[] = [
  { id: 1, symbol: "1n4002", parameters: [21, 37] },
  { id: 2, symbol: "1n4006", parameters: [13, 18] },
  { id: 3, symbol: "1n4007-dio", parameters: [17, 13] },
];

const parametersToMock: Parameter[] = [
  { id: 13, name: "Power", unit: "W" },
  { id: 17, name: "Capability", unit: "F" },
  { id: 18, name: "Size", unit: "m" },
  { id: 21, name: "Voltage", unit: "V" },
  { id: 37, name: "Resistance", unit: "R" },
];

const valueToMock: Value[] = [
  { id: 130, value: 200, parameter_id: 13 },
  { id: 131, value: 300, parameter_id: 13 },
  { id: 132, value: 400, parameter_id: 13 },
  { id: 133, value: 500, parameter_id: 13 },
  { id: 170, value: 21, parameter_id: 17 },
  { id: 171, value: 31, parameter_id: 17 },
  { id: 172, value: 41, parameter_id: 17 },
  { id: 173, value: 51, parameter_id: 17 },
  { id: 180, value: 13, parameter_id: 18 },
  { id: 181, value: 16, parameter_id: 18 },
  { id: 211, value: 220, parameter_id: 21 },
  { id: 212, value: 230, parameter_id: 21 },
  { id: 371, value: 40, parameter_id: 37 },
  { id: 372, value: 41, parameter_id: 37 },
  { id: 373, value: 42, parameter_id: 37 }
];

const eventsToMock: AntSourceEvent[] = [
  {
    name: "products",
    payload: productsToMock
  }, {
    name: "parameters",
    payload: parametersToMock
  }, {
    name: "values",
    payload: valueToMock
  }
];

export const getMockedSource = (): Observable<AntSourceEvent> => from(shuffleArray(eventsToMock))
  .pipe(concatMap((val) => of(val).pipe(delay(300))));

export const getMockedConfig = (): AntConfig => {
  return { sources, results };
};

const ifNullModifier = (ifNullValue: any): (value: any) => any => {
  return (value: any) => {
    if (!value) {
      return ifNullValue;
    }

    return value;
  };
};

const mapProductsSymbolToUpper = (products: Product[]): Product[] => {
  return products.map((prod) => {
    return {
      ...prod,
      symbol: prod.symbol.toUpperCase(),
      checked: true
    };
  });
};

const sources: AntSourceDefinition[] = [
  {
    name: "products",
    modifiers: [ ifNullModifier([]), mapProductsSymbolToUpper ],
    toResult: true,
    ifMissing: undefined
  }, {
    name: "parameters"
  }, {
    name: "values"
  }
];

const results: AntResultDefinition[] = [
  {
    parts: [
      { name: "params_with_values", toResult: true, ifMissing: [] },
      { name: "test_result", toResult: true, ifMissing: "test_not_working" }
    ],
    args: [ { name: "parameters" }, { name: "values" }],
    check: () => true,
    handler: (params: Parameter[], values: Value[]) => {
      const accValues = values.reduce((acc: any, value) => {
        if (!acc[value.parameter_id]) {
          acc[value.parameter_id] = [];
        }

        acc[value.parameter_id].push(value.id);

        return acc;
      }, {});

      const paramWithValues = params.map((param) => {
        const accValue = accValues[param.id] ? accValues[param.id] : [];

        return {
          ...param,
          accValue
        };
      });

      return [paramWithValues, "test00001oneoenoe"];
    }
  }
];
