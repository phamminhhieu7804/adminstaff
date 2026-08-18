import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, X, Check, Loader2, AlertCircle } from 'lucide-react';

export default function FaceCaptureModal({ isOpen, onClose, onCapture, employeeName }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadModels = async () => {
      try {
        setLoadingError('');
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        startVideo();
      } catch (err) {
        console.error("Failed to load models", err);
        setLoadingError('Không thể tải mô hình AI. Vui lòng kiểm tra lại kết nối mạng.');
      }
    };

    loadModels();

    return () => {
      stopVideo();
    };
  }, [isOpen]);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing camera", err);
        setLoadingError('Không thể truy cập camera. Vui lòng cấp quyền cho trình duyệt.');
      });
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    if(displaySize.width === 0) return;
    
    faceapi.matchDimensions(canvasRef.current, displaySize);

    setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                    .withFaceLandmarks()
                                    .withFaceDescriptor();
      
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (detection) {
        setFaceDetected(true);
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        faceapi.draw.drawDetections(canvasRef.current, resizedDetection);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetection);
      } else {
        setFaceDetected(false);
      }
    }, 500);
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks()
                                     .withFaceDescriptor();
      
      if (detection) {
        const descriptorArray = Array.from(detection.descriptor);
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.5);

        stopVideo();
        onCapture(descriptorArray, photoDataUrl);
      } else {
        alert("Không tìm thấy khuôn mặt! Vui lòng nhìn thẳng vào camera.");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi trích xuất dữ liệu khuôn mặt.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    stopVideo();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Quét khuôn mặt</h3>
            <p className="text-sm text-gray-500">Nhân viên: {employeeName || 'Chưa rõ'}</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center justify-center bg-gray-900 relative">
          {loadingError ? (
            <div className="text-center p-6 bg-red-50 rounded-xl max-w-sm">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-red-700 font-medium">{loadingError}</p>
            </div>
          ) : !modelsLoaded ? (
            <div className="flex flex-col items-center justify-center h-64 text-white">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-4" />
              <p className="font-medium">Đang tải mô hình AI...</p>
              <p className="text-xs text-gray-400 mt-2">Lần đầu có thể mất vài giây</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border-4 border-gray-800 shadow-2xl flex items-center justify-center min-h-[360px] bg-black">
              <div className="relative inline-block">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  onLoadedMetadata={handleVideoPlay}
                  className="block"
                  style={{ transform: 'scaleX(-1)', maxWidth: '100%', maxHeight: '400px' }}
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {!faceDetected && (
                  <div className="absolute inset-0 border-4 border-dashed border-red-500/50 flex items-center justify-center pointer-events-none">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      Không thấy khuôn mặt
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={handleClose}
            className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={handleCapture}
            disabled={!modelsLoaded || isCapturing || !faceDetected}
            className="px-6 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            Chụp và Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
