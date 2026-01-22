import { supabase } from './supabase';

// MIME 타입에서 확장자 추출
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'png';
}

// Base64 문자열을 Blob으로 변환
function base64ToBlob(base64Data: string, mimeType: string): Blob {
  // data:image/xxx;base64, 접두사 제거
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * 클라이언트에서 Supabase Storage에 이미지 직접 업로드
 * @param base64Data Base64 인코딩된 이미지 데이터
 * @param mimeType 이미지 MIME 타입 (예: image/png)
 * @param purpose 이미지 용도 (main, sub1, sub2, sub3)
 * @returns 업로드된 이미지의 public URL 또는 null
 */
export async function uploadImageToStorage(
  base64Data: string,
  mimeType: string,
  purpose: string
): Promise<string | null> {
  try {
    const blob = base64ToBlob(base64Data, mimeType);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = getExtensionFromMimeType(mimeType);
    const fileName = `${timestamp}-${random}-${purpose}.${extension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(fileName, blob, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error(`이미지 업로드 실패 (${purpose}):`, uploadError);
      return null;
    }

    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(uploadData.path);
      return urlData.publicUrl;
    }

    return null;
  } catch (error) {
    console.error(`이미지 처리 중 오류 (${purpose}):`, error);
    return null;
  }
}

/**
 * 여러 이미지를 병렬로 업로드
 * @param images 업로드할 이미지 배열
 * @returns 업로드된 URL 배열 (실패한 항목은 null)
 */
export async function uploadMultipleImages(
  images: Array<{
    base64Data: string;
    mimeType: string;
    purpose: string;
  }>
): Promise<Array<{ purpose: string; url: string | null }>> {
  const uploadPromises = images.map(async (img) => {
    const url = await uploadImageToStorage(img.base64Data, img.mimeType, img.purpose);
    return { purpose: img.purpose, url };
  });

  return Promise.all(uploadPromises);
}
