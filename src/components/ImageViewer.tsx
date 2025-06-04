import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  title
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
    setImagePosition({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetImagePosition();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetImagePosition();
    }
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };

  const resetImagePosition = () => {
    setZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(images[currentIndex]);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diary-image-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 flex justify-between items-center z-10">
        <div>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <p className="text-sm text-gray-300">
            {currentIndex + 1} of {images.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={downloadImage}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Download image"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-75 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
            title="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === images.length - 1}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-75 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
            title="Next image"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Image container */}
      <div 
        className="flex-1 flex items-center justify-center p-16 cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${zoom}) translate(${imagePosition.x / zoom}px, ${imagePosition.y / zoom}px)`,
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          draggable={false}
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4">
          <div className="flex justify-center gap-2 overflow-x-auto max-w-full">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  resetImagePosition();
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentIndex
                    ? 'border-white'
                    : 'border-transparent hover:border-gray-400'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 