// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { SIMBAD_HOSTS } from '../configs/cds';
import {
  buildSesameUrl,
  buildSimbadConeSearchUrl,
  buildTapNameQueryUrl,
  parseSesameResponse,
  parseTapNameResponse,
  resetPreferredSimbadHost,
  resolveSimbadObject,
  SimbadResolveError,
} from '../utils/simbad';
import { SESAME_NOT_FOUND, sesameError, sesameHit } from './sesameFixtures';

function textResponse(text: string, ok = true, status = 200, statusText = '') {
  return {
    ok,
    status,
    statusText,
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

/** A TAP answer to a name lookup, as served by the mirror */
function tapHit(mainId: string, ra: number, dec: number) {
  return textResponse(JSON.stringify({ data: [[mainId, ra, dec]] }));
}

/** A fetch that only settles when its signal aborts, like a host that hangs */
function hangingFetch(_url: unknown, init?: RequestInit) {
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError'))
    );
  });
}

function catchError(fn: () => unknown): SimbadResolveError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(SimbadResolveError);
    return e as SimbadResolveError;
  }
  throw new Error('Expected a SimbadResolveError');
}

async function expectResolveError(
  promise: Promise<unknown>,
  kind: SimbadResolveError['kind']
) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(SimbadResolveError);
  expect((error as SimbadResolveError).kind).toBe(kind);
  return error as SimbadResolveError;
}

describe('buildSesameUrl', () => {
  it('queries SIMBAD via Sesame with the name encoded and whitespace normalized', () => {
    expect(buildSesameUrl('  Sgr\nA* ')).toBe(
      'https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/S?Sgr%20A*'
    );
  });
});

describe('parseSesameResponse', () => {
  it('parses a hit, collapsing SIMBAD identifier padding', () => {
    expect(
      parseSesameResponse(sesameHit('M  31', 10.68470833, 41.26875), 'm31')
    ).toEqual({ identifier: 'M 31', ra: 10.68470833, dec: 41.26875 });
  });

  it('reports a miss as not-found', () => {
    const error = catchError(() =>
      parseSesameResponse(SESAME_NOT_FOUND, 'nope')
    );
    expect(error.kind).toBe('not-found');
    expect(error.message).toContain('"nope"');
  });

  it('reports resolver errors as unavailable, keeping only a short detail', () => {
    const trace =
      'java.lang.StringIndexOutOfBoundsException: offset 4071 ' +
      'x'.repeat(500) +
      '\n\tat cds.xml.XmlGen.addAttr(XmlGen.java:310)';
    const error = catchError(() =>
      parseSesameResponse(sesameError(trace), 'M 31')
    );
    expect(error.kind).toBe('unavailable');
    expect(error.detail).not.toContain('XmlGen');
    expect(error.detail!.length).toBeLessThanOrEqual(201);
  });

  it('reports objects without coordinates', () => {
    const text = sesameHit('Some Obj', 0, 0).replace(
      /<jradeg>.*<\/jdedeg>/s,
      ''
    );
    expect(catchError(() => parseSesameResponse(text, 'x')).kind).toBe(
      'no-coordinates'
    );
  });

  it('reports unreadable responses', () => {
    expect(
      catchError(() => parseSesameResponse('<html>oops</html>', 'x')).kind
    ).toBe('unexpected');
  });
});

describe('buildTapNameQueryUrl', () => {
  it('looks up the normalized name, escaping quotes', () => {
    const url = new URL(buildTapNameQueryUrl("  O'Neil\n1 ", SIMBAD_HOSTS[1]));
    expect(url.origin + url.pathname).toBe(SIMBAD_HOSTS[1].tapUrl);
    expect(url.searchParams.get('query')).toContain("id = 'O''Neil 1'");
  });
});

describe('parseTapNameResponse', () => {
  const parse = (body: unknown) => () =>
    parseTapNameResponse(JSON.stringify(body), 'x');

  it('parses a hit, collapsing SIMBAD identifier padding', () => {
    expect(parse({ data: [['M  31', 10.68, 41.27]] })()).toEqual({
      identifier: 'M 31',
      ra: 10.68,
      dec: 41.27,
    });
  });

  it('reports a miss as not-found', () => {
    expect(catchError(parse({ data: [] })).kind).toBe('not-found');
  });

  it('reports objects without coordinates', () => {
    expect(catchError(parse({ data: [['Some Obj', null, null]] })).kind).toBe(
      'no-coordinates'
    );
  });

  it('reports unreadable responses', () => {
    expect(catchError(parse({ nope: true })).kind).toBe('unexpected');
    expect(
      catchError(() => parseTapNameResponse('<html>oops</html>', 'x')).kind
    ).toBe('unexpected');
  });
});

describe('resolveSimbadObject', () => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    global.fetch = fetchMock;
    resetPreferredSimbadHost();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves a name to a position', async () => {
    fetchMock.mockResolvedValue(
      textResponse(sesameHit('3C 273', 187.27, 2.05))
    );
    await expect(resolveSimbadObject('3C 273')).resolves.toEqual({
      identifier: '3C 273',
      ra: 187.27,
      dec: 2.05,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('moves on to the mirror when the first host is unreachable', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(tapHit('M  31', 10.68, 41.27));
    await expect(resolveSimbadObject('M 31')).resolves.toMatchObject({
      identifier: 'M 31',
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      buildTapNameQueryUrl('M 31', SIMBAD_HOSTS[1])
    );
  });

  it('moves on to the mirror when the first host times out', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockImplementationOnce(hangingFetch)
      .mockResolvedValueOnce(tapHit('M  31', 10.68, 41.27));
    const promise = resolveSimbadObject('M 31');
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toMatchObject({ identifier: 'M 31' });
  });

  it('moves on to the mirror after a resolver error', async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse(sesameError('busy')))
      .mockResolvedValueOnce(tapHit('M  31', 10.68, 41.27));
    await expect(resolveSimbadObject('M 31')).resolves.toMatchObject({
      identifier: 'M 31',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('goes straight to the host that last answered', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(tapHit('M  31', 10.68, 41.27));
    await resolveSimbadObject('M 31');
    fetchMock.mockClear();

    await resolveSimbadObject('M 31');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      buildTapNameQueryUrl('M 31', SIMBAD_HOSTS[1])
    );
  });

  it('does not retry a plain miss', async () => {
    fetchMock.mockResolvedValue(textResponse(SESAME_NOT_FOUND));
    await expectResolveError(resolveSimbadObject('nope'), 'not-found');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after a second server failure', async () => {
    fetchMock.mockResolvedValue(
      textResponse('', false, 503, 'Service Unavailable')
    );
    const error = await expectResolveError(resolveSimbadObject('M31'), 'http');
    expect(error.message).toContain('503 Service Unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps fetch failures to a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expectResolveError(resolveSimbadObject('M31'), 'network');
  });

  it('times out a request that never settles', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(hangingFetch);
    const promise = expectResolveError(resolveSimbadObject('M31'), 'timeout');
    await vi.runAllTimersAsync();
    await promise;
  });

  it('rethrows the raw abort when the caller cancels', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(hangingFetch);
    const promise = resolveSimbadObject('M31', controller.signal);
    controller.abort();
    const error = await promise.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(SimbadResolveError);
  });
});

describe('buildSimbadConeSearchUrl', () => {
  afterEach(() => {
    resetPreferredSimbadHost();
  });

  it('builds a sim-coo link around the position', () => {
    const url = new URL(buildSimbadConeSearchUrl(10.68, 41.27, 5));
    expect(url.origin + url.pathname).toBe(
      `${SIMBAD_HOSTS[0].pagesUrl}/sim-coo`
    );
    expect(url.searchParams.get('Coord')).toBe('10.68 41.27');
    expect(url.searchParams.get('Radius')).toBe('5');
    expect(url.searchParams.get('Radius.unit')).toBe('arcmin');
  });

  it("converts a negative RA to SIMBAD's 0 -> 360 convention", () => {
    const url = new URL(buildSimbadConeSearchUrl(-10, 5, 5));
    expect(url.searchParams.get('Coord')).toBe('350 5');
  });

  it('links to the host that last answered', async () => {
    global.fetch = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(tapHit('M  31', 10.68, 41.27));
    await resolveSimbadObject('M 31');

    expect(buildSimbadConeSearchUrl(10.68, 41.27, 5)).toMatch(
      new RegExp(`^${SIMBAD_HOSTS[1].pagesUrl}/sim-coo\\?`)
    );
  });
});
