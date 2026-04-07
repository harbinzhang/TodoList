import { cleanFirestoreData, safeToDate } from '../firestoreUtils';

describe('cleanFirestoreData', () => {
  it('strips undefined values recursively', () => {
    expect(
      cleanFirestoreData({
        title: 'Task',
        description: undefined,
        nested: {
          keep: true,
          drop: undefined,
        },
      })
    ).toEqual({
      title: 'Task',
      nested: {
        keep: true,
      },
    });
  });
});

describe('safeToDate', () => {
  it('converts timestamp-like values', () => {
    const date = safeToDate({ seconds: 1_700_000_000 });

    expect(date).toBeInstanceOf(Date);
    expect(date?.getTime()).toBe(1_700_000_000_000);
  });
});
