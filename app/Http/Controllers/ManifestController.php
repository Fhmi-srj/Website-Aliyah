<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class ManifestController extends Controller
{
    /**
     * Serve dynamic manifest.json with lembaga data
     */
    public function manifest(): JsonResponse
    {
        $namaLembaga = AppSetting::getValue('nama_lembaga', 'MAHAKAM APP');
        $motoLembaga = AppSetting::getValue('moto_lembaga', 'Sistem Informasi Madrasah');

        $manifest = [
            'name' => $namaLembaga,
            'short_name' => $namaLembaga,
            'description' => $motoLembaga,
            'start_url' => '/guru',
            'display' => 'standalone',
            'orientation' => 'portrait',
            'background_color' => '#ffffff',
            'theme_color' => '#16a34a',
            'icons' => [
                [
                    'src' => '/pwa-icon/192',
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any maskable',
                ],
                [
                    'src' => '/pwa-icon/512',
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'any maskable',
                ],
            ],
        ];

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json');
    }

    /**
     * Serve resized PWA icon from lembaga logo
     */
    public function icon(int $size)
    {
        $logoPath = AppSetting::getValue('logo_lembaga');

        // Fallback to default logo
        if (!$logoPath || !Storage::disk('public')->exists($logoPath)) {
            $defaultPath = public_path('images/logo.png');
            if (file_exists($defaultPath)) {
                return response()->file($defaultPath, [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=86400',
                ]);
            }
            abort(404);
        }

        $fullPath = Storage::disk('public')->path($logoPath);

        // If GD is available, resize the image
        if (function_exists('imagecreatefrompng') || function_exists('imagecreatefromjpeg')) {
            $size = min($size, 512); // Cap at 512

            $imageInfo = @getimagesize($fullPath);
            if (!$imageInfo) {
                return response()->file($fullPath, [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=86400',
                ]);
            }

            $mime = $imageInfo['mime'];
            $source = null;

            switch ($mime) {
                case 'image/png':
                    $source = @imagecreatefrompng($fullPath);
                    break;
                case 'image/jpeg':
                case 'image/jpg':
                    $source = @imagecreatefromjpeg($fullPath);
                    break;
                case 'image/webp':
                    $source = @imagecreatefromwebp($fullPath);
                    break;
            }

            if ($source) {
                $resized = imagecreatetruecolor($size, $size);
                // Preserve transparency
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
                $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
                imagefill($resized, 0, 0, $transparent);

                $srcW = imagesx($source);
                $srcH = imagesy($source);
                imagecopyresampled($resized, $source, 0, 0, 0, 0, $size, $size, $srcW, $srcH);

                ob_start();
                imagepng($resized);
                $data = ob_get_clean();

                imagedestroy($source);
                imagedestroy($resized);

                return response($data, 200, [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=86400',
                ]);
            }
        }

        // Fallback: serve original file
        return response()->file($fullPath, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
