jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('../constants/api', () => ({ API_URL: 'http://localhost:4000/api' }));

import MockAdapter from 'axios-mock-adapter';
import api from '../libs/axios';
import { FaceService } from '../services/face.service';

const mock = new MockAdapter(api);

beforeEach(() => {
  mock.reset();
  jest.restoreAllMocks();
});

describe('FaceService.registerFace', () => {
  const photos = [
    { uri: 'file://face_1.jpg' },
    { uri: 'file://face_2.jpg' },
    { uri: 'file://face_3.jpg' },
    { uri: 'file://face_4.jpg' },
  ];

  it('POSTs to /face/register and returns data on success', async () => {
    mock.onPost('/face/register').reply(200, { message: 'Face registered successfully' });

    const result = await FaceService.registerFace(photos);

    expect(result).toEqual({ message: 'Face registered successfully' });
    expect(mock.history.post[0].url).toBe('/face/register');
  });

  it('includes consent_given=true and consent_channel=mobile in FormData', async () => {
    const appendSpy = jest.spyOn(FormData.prototype, 'append');
    mock.onPost('/face/register').reply(200, {});

    await FaceService.registerFace(photos);

    expect(appendSpy).toHaveBeenCalledWith('consent_given', 'true');
    expect(appendSpy).toHaveBeenCalledWith('consent_channel', 'mobile');
  });

  it('appends one images entry per photo', async () => {
    const appendSpy = jest.spyOn(FormData.prototype, 'append');
    mock.onPost('/face/register').reply(200, {});

    await FaceService.registerFace(photos);

    const imageCalls = appendSpy.mock.calls.filter(([key]) => key === 'images');
    expect(imageCalls).toHaveLength(4);
  });

  it('throws on API error', async () => {
    mock.onPost('/face/register').reply(400, { message: 'No images provided' });

    await expect(FaceService.registerFace(photos)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});

describe('FaceService.withdrawConsent', () => {
  it('DELETEs /face/consent and returns data', async () => {
    mock.onDelete('/face/consent').reply(200, { message: 'Consent withdrawn' });

    const result = await FaceService.withdrawConsent();

    expect(result).toEqual({ message: 'Consent withdrawn' });
    expect(mock.history.delete[0].url).toBe('/face/consent');
  });

  it('throws on API error', async () => {
    mock.onDelete('/face/consent').reply(404, { message: 'No face data found' });

    await expect(FaceService.withdrawConsent()).rejects.toMatchObject({
      response: { status: 404 },
    });
  });
});
