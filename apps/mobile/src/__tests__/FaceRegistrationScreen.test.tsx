// jest hoists jest.mock() — cannot reference imported variables (React, etc.) in factory.
// Use require() inside factory instead.

const mockTakePicture = jest.fn();

jest.mock('expo-camera', () => {
  const { forwardRef, useImperativeHandle, createElement } = require('react');
  const { View } = require('react-native');
  return {
    CameraView: forwardRef((props: any, ref: any) => {
      useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePicture }));
      return createElement(View, { testID: 'camera-view' });
    }),
    useCameraPermissions: jest.fn(),
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  const { createElement } = require('react');
  return { LinearGradient: ({ children }: any) => createElement(View, null, children) };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../services/face.service', () => ({
  FaceService: { registerFace: jest.fn(), withdrawConsent: jest.fn() },
}));

jest.mock('../components/ui/Icon', () => ({ Icon: () => null }));

jest.mock('../theme', () => ({
  useTheme: () => ({
    colors: {
      brand: { primary: '#4F6EF7', primaryHover: '#3B5BF6' },
      text: { primary: '#fff', secondary: '#aaa', disabled: '#666' },
      background: { base: '#fff' },
      status: { success: '#22C55E' },
    },
  }),
}));

// ── Imports after mocks ────────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { FaceService } from '../services/face.service';
import FaceRegistrationScreen from '../screens/employee/FaceRegistrationScreen';

// ── Helpers ────────────────────────────────────────────────────────────────────

const grantedPermission = [{ granted: true }, jest.fn()];

function renderScreen() {
  return render(<FaceRegistrationScreen />);
}

async function passConsent(utils: ReturnType<typeof render>) {
  fireEvent.press(utils.getByText('Tôi đã đọc và đồng ý với chính sách thu thập dữ liệu sinh trắc học'));
  fireEvent.press(utils.getByText('Đồng ý và tiếp tục'));
}

async function capture4Photos(utils: ReturnType<typeof render>) {
  await act(async () => { fireEvent.press(utils.getByText('Bắt đầu chụp')); });
  await act(async () => { fireEvent.press(utils.getByText('Chụp tiếp (1/4)')); });
  await act(async () => { fireEvent.press(utils.getByText('Chụp tiếp (2/4)')); });
  await act(async () => { fireEvent.press(utils.getByText('Chụp tiếp (3/4)')); });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockTakePicture.mockResolvedValue({ uri: 'file://mock-photo.jpg' });
  (useCameraPermissions as jest.Mock).mockReturnValue(grantedPermission);
});

describe('FaceRegistrationScreen — consent gate', () => {
  it('shows consent screen before camera', () => {
    const { getByText } = renderScreen();
    expect(getByText('Đồng ý thu thập dữ liệu sinh trắc học')).toBeTruthy();
  });

  it('confirm button does nothing until checkbox is ticked', () => {
    const utils = renderScreen();
    fireEvent.press(utils.getByText('Đồng ý và tiếp tục'));
    expect(utils.getByText('Đồng ý thu thập dữ liệu sinh trắc học')).toBeTruthy();
  });

  it('shows camera after consent', () => {
    const utils = renderScreen();
    passConsent(utils);
    expect(utils.getByTestId('camera-view')).toBeTruthy();
  });
});

describe('FaceRegistrationScreen — capture flow', () => {
  it('shows "Bắt đầu chụp" initially', () => {
    const utils = renderScreen();
    passConsent(utils);
    expect(utils.getByText('Bắt đầu chụp')).toBeTruthy();
  });

  it('updates counter after each capture', async () => {
    const utils = renderScreen();
    passConsent(utils);
    await act(async () => { fireEvent.press(utils.getByText('Bắt đầu chụp')); });
    expect(utils.getByText('Chụp tiếp (1/4)')).toBeTruthy();
  });

  it('calls FaceService.registerFace with 4 photos after 4 captures', async () => {
    (FaceService.registerFace as jest.Mock).mockResolvedValue({ message: 'ok' });
    const utils = renderScreen();
    passConsent(utils);
    await capture4Photos(utils);

    await waitFor(() => {
      expect(FaceService.registerFace).toHaveBeenCalledTimes(1);
      expect(FaceService.registerFace).toHaveBeenCalledWith(
        Array(4).fill({ uri: 'file://mock-photo.jpg' })
      );
    });
  });

  it('shows success modal after successful registration', async () => {
    (FaceService.registerFace as jest.Mock).mockResolvedValue({ message: 'ok' });
    const utils = renderScreen();
    passConsent(utils);
    await capture4Photos(utils);

    await waitFor(() => expect(utils.getByText('Đăng ký thành công!')).toBeTruthy());
  });

  it('shows Alert and resets to initial state on API error', async () => {
    (FaceService.registerFace as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Không đủ ảnh' } },
    });
    const utils = renderScreen();
    passConsent(utils);
    await capture4Photos(utils);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Đăng ký thất bại',
        'Không đủ ảnh',
        expect.any(Array)
      );
    });
    expect(utils.getByText('Bắt đầu chụp')).toBeTruthy();
  });
});
