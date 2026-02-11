<?php

namespace App\Services;

use Intervention\Image\Laravel\Facades\Image;
use Illuminate\Support\Facades\Storage;

class ImageService
{
    /**
     * Compress and store an uploaded image
     * Target size: 100-200KB
     * 
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $path Directory path in storage
     * @param string|null $filename Optional custom filename
     * @param int $maxWidth Maximum width (will maintain aspect ratio)
     * @param int $targetSizeKb Target file size in KB (default 150KB)
     * @return string|null Path to stored file
     */
    public static function compressAndStore($file, $path, $filename = null, $maxWidth = 1200, $targetSizeKb = 150)
    {
        try {
            // Generate filename if not provided
            if (!$filename) {
                $filename = time() . '_' . uniqid() . '.jpg';
            }

            // Ensure jpg extension for better compression
            $extension = pathinfo($filename, PATHINFO_EXTENSION);
            if (!in_array(strtolower($extension), ['jpg', 'jpeg'])) {
                $filename = pathinfo($filename, PATHINFO_FILENAME) . '.jpg';
            }

            // Create image instance
            $image = Image::read($file);

            // Resize if width exceeds max
            $width = $image->width();
            if ($width > $maxWidth) {
                $image = $image->scale(width: $maxWidth);
            }

            // Calculate initial quality based on file size
            $originalSize = $file->getSize();
            $targetSize = $targetSizeKb * 1024; // Convert to bytes

            // Start with quality 85 and adjust
            $quality = 85;

            // If original is much larger, start with lower quality
            if ($originalSize > $targetSize * 4) {
                $quality = 60;
            } elseif ($originalSize > $targetSize * 2) {
                $quality = 70;
            }

            // Encode to JPEG with calculated quality
            $encoded = $image->toJpeg($quality);

            // If still too large, progressively reduce quality
            $attempts = 0;
            while (strlen($encoded->toString()) > $targetSize * 1.5 && $quality > 30 && $attempts < 5) {
                $quality -= 10;
                $encoded = $image->toJpeg($quality);
                $attempts++;
            }

            // Store the compressed image
            $fullPath = rtrim($path, '/') . '/' . $filename;
            Storage::disk('public')->put($fullPath, $encoded->toString());

            return $fullPath;
        } catch (\Exception $e) {
            \Log::error('Image compression failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Compress and store multiple images
     * 
     * @param array $files Array of uploaded files
     * @param string $path Directory path in storage
     * @param string $prefix Filename prefix
     * @return array Array of stored file paths
     */
    public static function compressAndStoreMultiple($files, $path, $prefix = '')
    {
        $paths = [];

        foreach ($files as $index => $file) {
            $filename = $prefix . '_' . time() . '_' . ($index + 1) . '.jpg';
            $storedPath = self::compressAndStore($file, $path, $filename);

            if ($storedPath) {
                $paths[] = $storedPath;
            }
        }

        return $paths;
    }

    /**
     * Compress a Base64 image and store it
     * 
     * @param string $base64String Base64 encoded image string
     * @param string $path Directory path in storage
     * @param string|null $filename Optional custom filename
     * @param int $maxWidth Maximum width
     * @param int $targetSizeKb Target file size in KB
     * @return string|null Path to stored file or compressed Base64
     */
    public static function compressBase64($base64String, $path = null, $filename = null, $maxWidth = 1200, $targetSizeKb = 150)
    {
        try {
            // Handle data URL format
            $imageData = $base64String;
            if (strpos($base64String, 'base64,') !== false) {
                $imageData = explode('base64,', $base64String)[1];
            }

            // Decode base64
            $decodedImage = base64_decode($imageData);
            if (!$decodedImage) {
                return $base64String; // Return original if decode fails
            }

            // Create image instance
            $image = Image::read($decodedImage);

            // Resize if width exceeds max
            $width = $image->width();
            if ($width > $maxWidth) {
                $image = $image->scale(width: $maxWidth);
            }

            // Calculate quality based on original size
            $originalSize = strlen($decodedImage);
            $targetSize = $targetSizeKb * 1024;

            $quality = 85;
            if ($originalSize > $targetSize * 4) {
                $quality = 50;
            } elseif ($originalSize > $targetSize * 2) {
                $quality = 65;
            }

            // Encode to JPEG
            $encoded = $image->toJpeg($quality);

            // Progressive quality reduction if needed
            $attempts = 0;
            while (strlen($encoded->toString()) > $targetSize * 1.5 && $quality > 25 && $attempts < 5) {
                $quality -= 10;
                $encoded = $image->toJpeg($quality);
                $attempts++;
            }

            // If path is provided, store to disk
            if ($path) {
                if (!$filename) {
                    $filename = time() . '_' . uniqid() . '.jpg';
                }
                $fullPath = rtrim($path, '/') . '/' . $filename;
                Storage::disk('public')->put($fullPath, $encoded->toString());
                return $fullPath;
            }

            // Otherwise return as Base64
            return 'data:image/jpeg;base64,' . base64_encode($encoded->toString());
        } catch (\Exception $e) {
            \Log::error('Base64 image compression failed: ' . $e->getMessage());
            return $base64String; // Return original on failure
        }
    }

    /**
     * Compress multiple Base64 images
     * 
     * @param array $base64Images Array of base64 image strings
     * @param int $maxWidth Maximum width
     * @param int $targetSizeKb Target file size in KB
     * @return array Array of compressed base64 strings
     */
    public static function compressBase64Multiple($base64Images, $maxWidth = 1200, $targetSizeKb = 150)
    {
        $compressed = [];
        foreach ($base64Images as $base64) {
            $compressed[] = self::compressBase64($base64, null, null, $maxWidth, $targetSizeKb);
        }
        return $compressed;
    }

    /**
     * Delete an image from storage
     * 
     * @param string $path Path to the image
     * @return bool
     */
    public static function delete($path)
    {
        if ($path && Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->delete($path);
        }
        return false;
    }
}
