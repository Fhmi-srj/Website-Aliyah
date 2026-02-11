<?php

namespace App\Http\Controllers;

use App\Models\DocumentVerification;
use App\Services\PrintService;

class VerificationController extends Controller
{
    public function show($id)
    {
        $doc = DocumentVerification::find($id);

        if (!$doc) {
            return view('verify', [
                'found' => false,
                'logoUrl' => PrintService::getLogoUrl() ?? asset('images/logo.png'),
                'schoolName' => PrintService::getSchoolName(),
            ]);
        }

        return view('verify', [
            'found' => true,
            'doc' => $doc,
            'logoUrl' => PrintService::getLogoUrl() ?? asset('images/logo.png'),
            'schoolName' => PrintService::getSchoolName(),
        ]);
    }
}
