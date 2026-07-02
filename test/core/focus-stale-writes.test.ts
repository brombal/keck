import { atomic, disable, enable, focus, observe, reset } from 'keck';
import { vi } from 'vitest';
import { createData } from '../shared-data';

/**
 * Writes to pending observations during a focus session must not be silently lost.
 *
 * While an observer is mid-session, its callback cannot fire (the consumer may be mid-render),
 * but a cross-observer write to a path the session has already read means the session's consumer
 * is holding a stale value. The write is recorded and the callback fires when the session
 * settles (commit or discard). Writes made through the observer's own proxy are exempt: the
 * consumer itself made them and can re-read (the render-adjustment pattern).
 */
describe('focus() — writes during a session', () => {
  test('Cross-observer write to a pending observation triggers callback on commit', () => {
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    // Prior committed session, so the path has an existing valid observation
    let session = focus(reader);
    void reader.object1.value1;
    session.commit();

    session = focus(reader);
    void reader.object1.value1; // pending read
    writer.object1.value1 = 'written-mid-session';

    // Mid-session: must not fire yet (the consumer may be mid-render)
    expect(onChange).toHaveBeenCalledTimes(0);

    session.commit();
    expect(onChange).toHaveBeenCalledTimes(1);

    // Observations are live after commit; a later write triggers normally
    writer.object1.value1 = 'written-after-commit';
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test('Cross-observer write to a pending observation triggers on commit of the first-ever session', () => {
    // Same as above but with no prior committed session: the pending observation is brand new.
    // (This is the React mount case: a descendant writes state its ancestor read during the
    // ancestor's very first render.)
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    const session = focus(reader);
    void reader.object1.value1;
    writer.object1.value1 = 'written-mid-session';
    expect(onChange).toHaveBeenCalledTimes(0);

    session.commit();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('Cross-observer write before the pending read does not trigger on commit', () => {
    // The session reads the value after it was written, so the consumer saw the fresh value.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    const session = focus(reader);
    writer.object1.value1 = 'written-before-read';
    void reader.object1.value1;
    session.commit();

    expect(onChange).toHaveBeenCalledTimes(0);
  });

  test("Write through the observer's own proxy during its session does not trigger on commit", () => {
    // The render-adjustment pattern: the consumer wrote the value itself and can re-read it.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });

    let session = focus(reader);
    void reader.object1.value1;
    session.commit();

    session = focus(reader);
    void reader.object1.value1;
    reader.object1.value1 = 'self-adjusted';
    session.commit();

    expect(onChange).toHaveBeenCalledTimes(0);
  });

  test('Stale write triggers on discard when the observation was committed by a prior session', () => {
    // A discarded session restores the prior observations; the write would have triggered the
    // prior (restored) observation had the session not briefly existed, so it must fire.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    let session = focus(reader);
    void reader.object1.value1;
    session.commit();

    session = focus(reader);
    void reader.object1.value1;
    writer.object1.value1 = 'written-mid-session';
    session.discard();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('Write to a committed observation not re-read in the session triggers on discard', () => {
    // The session never re-read the path, but the *restored* observation belongs to a consumer
    // whose last committed state read the old value; the write would have triggered normally
    // had the session not briefly existed.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    let session = focus(reader);
    void reader.object1.value1;
    session.commit();

    session = focus(reader); // session does NOT re-read object1.value1
    void reader.object1.value2;
    writer.object1.value1 = 'written-mid-session';
    session.discard();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('Write to a committed observation not re-read in the session does not trigger on commit', () => {
    // The session never re-read the path, so the newly committed observations no longer include
    // it — the consumer's new state does not depend on it.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    let session = focus(reader);
    void reader.object1.value1;
    session.commit();

    session = focus(reader); // session does NOT re-read object1.value1
    void reader.object1.value2;
    writer.object1.value1 = 'written-mid-session';
    session.commit();

    expect(onChange).toHaveBeenCalledTimes(0);
  });

  test('Committed observation written then re-read in the session does not trigger on commit', () => {
    // The write happened before the session re-read the path, so the consumer saw the fresh
    // value; the committed state is not stale.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    let session = focus(reader);
    void reader.object1.value1;
    session.commit();

    session = focus(reader);
    writer.object1.value1 = 'written-mid-session';
    void reader.object1.value1; // re-read after the write — fresh value
    session.commit();

    expect(onChange).toHaveBeenCalledTimes(0);
  });

  test('Stale write does not trigger on discard when the observation was never committed', () => {
    // Discard restores nothing for this path: after discard the observer is not observing it,
    // so no notification should fire.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    const session = focus(reader);
    void reader.object1.value1;
    writer.object1.value1 = 'written-mid-session';
    session.discard();

    expect(onChange).toHaveBeenCalledTimes(0);
  });

  test('Stale write does not trigger on commit when the observer is disabled', () => {
    // disable() means "don't call my callback" — the stale notification respects it the same
    // way a normal write notification would.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    const session = focus(reader);
    void reader.object1.value1;
    writer.object1.value1 = 'written-mid-session';
    disable(reader);
    session.commit();

    expect(onChange).toHaveBeenCalledTimes(0);

    // Re-enabling resumes normal notification for the committed observations
    enable(reader);
    writer.object1.value1 = 'written-after-enable';
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('reset() during a session clears stale notifications on discard', () => {
    // reset() wipes the observer's valid observations; after discard there is nothing restored
    // for the stale writes to fire against.
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    let session = focus(reader);
    void reader.object1.value1;
    void reader.object1.value2;
    session.commit();

    session = focus(reader);
    void reader.object1.value1; // pending (also still valid from the prior commit)
    writer.object1.value1 = 'written-mid-session'; // stale-pending
    writer.object1.value2 = 'written-mid-session'; // stale-committed (not re-read)
    reset(reader);
    session.discard();

    expect(onChange).toHaveBeenCalledTimes(0);
  });

  test('Stale write triggers after auto-discard via microtask', async () => {
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    let session = focus(reader);
    void reader.object1.value1;
    session.commit();

    session = focus(reader); // abandoned — neither commit nor discard called
    void reader.object1.value1;
    writer.object1.value1 = 'written-mid-session';

    await Promise.resolve(); // flush the auto-discard microtask

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('Cross-observer write inside atomic() during a session triggers once on commit', () => {
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    const session = focus(reader);
    void reader.object1.value1;
    void reader.object1.value2;

    atomic(() => {
      writer.object1.value1 = 'atomic-write-1';
      writer.object1.value2 = 'atomic-write-2';
    });
    expect(onChange).toHaveBeenCalledTimes(0);

    session.commit();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('Commit inside atomic() batches the stale notification with the atomic block', () => {
    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    const session = focus(reader);
    void reader.object1.value1;
    writer.object1.value1 = 'written-mid-session';

    atomic(() => {
      session.commit();
      // Batched into the atomic block — must not fire until the block completes
      expect(onChange).toHaveBeenCalledTimes(0);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('Pending-only observation survives a mid-session own-proxy write', async () => {
    // Regression test for the observationsForObserver eviction: a mid-session write to a
    // pending-only observation used to fail hasObservation() and evict the Observation from
    // pathEntry.observationsForObserver — its only strong holder — so after the session's
    // closures were collected, the observation was GC'd and notifications for the path silently
    // stopped.
    expect(global.gc).toBeDefined();

    const data = createData();
    const onChange = vi.fn();
    const reader = observe(data, { focusable: true, onChange });
    const writer = observe(data);

    (() => {
      const session = focus(reader);
      void reader.object2.value1; // pending-only: never committed before
      reader.object2.value1 = 'self-write'; // own-proxy write mid-session
      session.commit();
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    writer.object2.value1 = 'external-write';
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
