import api from '../libs/axios';

export const FaceService = {
  registerFace: async (photos: Array<{ uri: string }>) => {
    const formData = new FormData();
    photos.forEach((photo, i) => {
      formData.append('images', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `face_${i + 1}.jpg`,
      } as any);
    });
    formData.append('consent_given', 'true');
    formData.append('consent_channel', 'mobile');

    const response = await api.post('/face/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data;
  },

  withdrawConsent: async () => {
    const response = await api.delete('/face/consent');
    return response.data;
  },
};
