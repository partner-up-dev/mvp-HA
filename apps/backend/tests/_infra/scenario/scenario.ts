import test from "node:test";

export type ScenarioRecordValue =
  | null
  | boolean
  | number
  | string
  | readonly ScenarioRecordValue[]
  | { readonly [key: string]: ScenarioRecordValue };

export type ScenarioContext = {
  readonly name: string;
  record(key: string, value: ScenarioRecordValue): void;
  getRecords(): Readonly<Record<string, ScenarioRecordValue>>;
};

export function scenario(
  name: string,
  run: (context: ScenarioContext) => Promise<void>,
): void {
  test(name, async () => {
    const records: Record<string, ScenarioRecordValue> = {};
    const context: ScenarioContext = {
      name,
      record(key, value) {
        records[key] = value;
      },
      getRecords() {
        return records;
      },
    };

    try {
      await run(context);
    } catch (error) {
      const detail = JSON.stringify(
        {
          scenario: name,
          records,
        },
        null,
        2,
      );
      if (error instanceof Error) {
        error.message = `${error.message}\nScenario context:\n${detail}`;
      }
      throw error;
    }
  });
}
