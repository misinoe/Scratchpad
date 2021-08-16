export default class Base64 {
  private static cypher = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';

  public static encode(value: number): string {
    const {cypher} = Base64;
    const {length} = cypher;

    let result = '';

    while (value > 0) {
      result = cypher[(value | 0) % length] + result;
      value = value / length | 0;
    }

    return result;
  }

  public static decode(value: string): number {
    const {cypher} = Base64;
    const {length} = cypher;

    const result = value.split('').reverse().map(char => {
      return cypher.indexOf(char);
    }).reduce((accumulator, currentValue, index) => {
      return accumulator + (currentValue << (6 * index));
    });

    return result;
  }
  
}