export type SPAGuardEvent = SPAGuardEventTest & { name: "test" };

export interface SPAGuardEventTest {
  name: "test";
}

export type SubscribeFn = (event: SPAGuardEvent) => void;

export type UnsubscribeFn = () => void;
