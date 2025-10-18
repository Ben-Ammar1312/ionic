import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({
  providedIn: 'root',
})
export class Photos {
  async takePicture() {
    let capturedPhoto = await Camera.getPhoto({
      source: CameraSource.Camera,
      quality: 90,
      resultType: CameraResultType.Uri,
      webUseInput: false
    });
    console.log(capturedPhoto.dataUrl);
  }

  async selectionnerPhotos() {
    let selectionPhotos = await Camera.pickImages({
      quality: 90,
      limit: 5,
    });
    return selectionPhotos;
  }
}