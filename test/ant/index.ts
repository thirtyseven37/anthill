import { expect } from "chai";
import { fromObservable } from "../../src/index";
import { getMockedSource, getMockedConfig } from "../../src/source_mock";

describe("Anthill main exported functions test", () => {
  it("Shoud be fromObservable response arrays", () => {
    const expected = [
      { id: 1, symbol: "1N4002", parameters: [21, 37], checked: true },
      { id: 2, symbol: "1N4006", parameters: [13, 18], checked: true },
      { id: 3, symbol: "1N4007-DIO", parameters: [17, 13], checked: true },
      { id: 13, name: "Power", unit: "W", accValue: [130, 131, 132, 133] },
      { id: 17, name: "Capability", unit: "F", accValue: [170, 171, 172, 173] },
      { id: 18, name: "Size", unit: "m", accValue: [180, 181] },
      { id: 21, name: "Voltage", unit: "V", accValue: [211, 212] },
      { id: 37, name: "Resistance", unit: "R", accValue: [371, 372, 373] }
    ];

    const reduceObjectArrays = (result: any, next: any) => {
      Array.prototype.push.apply(result, next);

      return result;
    };

    fromObservable(getMockedSource(), getMockedConfig())
      .map((response) => response.payload)
      .filter(Array.isArray)
      .reduce(reduceObjectArrays, [])
      .subscribe((actual) => expect(expected).to.be.deep.equal(actual));
  });
});
