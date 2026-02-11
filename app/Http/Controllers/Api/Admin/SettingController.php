<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    /**
     * Get all settings
     */
    public function index()
    {
        $settings = AppSetting::all()->mapWithKeys(function ($item) {
            $value = $item->value;

            // Cast value based on type
            switch ($item->type) {
                case 'boolean':
                    $value = filter_var($item->value, FILTER_VALIDATE_BOOLEAN);
                    break;
                case 'integer':
                    $value = (int) $item->value;
                    break;
                case 'json':
                    $value = json_decode($item->value, true);
                    break;
            }

            return [
                $item->key => [
                    'value' => $value,
                    'type' => $item->type,
                    'description' => $item->description,
                ]
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Get a specific setting
     */
    public function show($key)
    {
        $setting = AppSetting::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Setting not found',
            ], 404);
        }

        $value = AppSetting::getValue($key);

        return response()->json([
            'success' => true,
            'data' => [
                'key' => $setting->key,
                'value' => $value,
                'type' => $setting->type,
                'description' => $setting->description,
            ],
        ]);
    }

    /**
     * Update a setting
     */
    public function update(Request $request, $key)
    {
        $setting = AppSetting::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Setting not found',
            ], 404);
        }

        $value = $request->input('value');

        // Convert value based on type
        if ($setting->type === 'boolean') {
            $value = $value ? 'true' : 'false';
        } elseif ($setting->type === 'json') {
            $value = json_encode($value);
        }

        $setting->value = $value;
        $setting->save();

        return response()->json([
            'success' => true,
            'message' => 'Setting updated successfully',
            'data' => [
                'key' => $setting->key,
                'value' => AppSetting::getValue($key),
                'type' => $setting->type,
                'description' => $setting->description,
            ],
        ]);
    }

    /**
     * Upload logo lembaga
     */
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        // Delete old logo if exists
        $oldLogo = AppSetting::getValue('logo_lembaga');
        if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
            Storage::disk('public')->delete($oldLogo);
        }

        // Store new logo
        $path = $request->file('logo')->store('lembaga', 'public');

        // Update setting
        AppSetting::setValue('logo_lembaga', $path);

        return response()->json([
            'success' => true,
            'message' => 'Logo berhasil diupload',
            'data' => [
                'path' => $path,
                'url' => asset('storage/' . $path),
            ],
        ]);
    }

    /**
     * Upload kop surat image
     */
    public function uploadKop(Request $request)
    {
        $request->validate([
            'kop' => 'required|image|mimes:jpeg,png,jpg|max:4096',
        ]);

        // Delete old kop if exists
        $oldKop = AppSetting::getValue('kop_image');
        if ($oldKop && Storage::disk('public')->exists($oldKop)) {
            Storage::disk('public')->delete($oldKop);
        }

        // Store new kop
        $path = $request->file('kop')->store('lembaga', 'public');

        // Create or update kop_image setting
        AppSetting::updateOrCreate(
            ['key' => 'kop_image'],
            [
                'value' => $path,
                'type' => 'string',
                'description' => 'Gambar kop surat',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Kop surat berhasil diupload',
            'data' => [
                'path' => $path,
                'url' => asset('storage/' . $path),
            ],
        ]);
    }

    /**
     * Get public settings for website meta tags
     */
    public function getPublicSettings()
    {
        $settings = [
            'nama_lembaga' => AppSetting::getValue('nama_lembaga', 'MA Al-Hikam'),
            'moto_lembaga' => AppSetting::getValue('moto_lembaga', ''),
            'logo_lembaga' => AppSetting::getValue('logo_lembaga'),
            'alamat_lembaga' => AppSetting::getValue('alamat_lembaga', ''),
            'telepon_lembaga' => AppSetting::getValue('telepon_lembaga', ''),
            'email_lembaga' => AppSetting::getValue('email_lembaga', ''),
        ];

        // Add full URL for logo
        if ($settings['logo_lembaga']) {
            $settings['logo_url'] = asset('storage/' . $settings['logo_lembaga']);
        }

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Check if attendance is unlocked (public endpoint for Guru panel)
     */
    public function checkAttendanceUnlock()
    {
        return response()->json([
            'success' => true,
            'unlocked' => AppSetting::isAttendanceUnlocked(),
        ]);
    }
}
