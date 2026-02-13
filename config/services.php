<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'mpwa' => [
        'url' => env('MPWA_URL', 'http://serverwa.hello-inv.com/send-message'),
        'api_key' => env('MPWA_API_KEY'),
        'sender' => env('MPWA_SENDER'),
        'group_id' => env('MPWA_GROUP_ID'),
        'schedule_time' => env('WA_SCHEDULE_TIME', '06:30'),
        'recap_time' => env('WA_RECAP_TIME', '13:30'),
        'activity_report_time' => env('WA_ACTIVITY_REPORT_TIME', '18:00'),
        'meeting_invite_time' => env('WA_MEETING_INVITE_TIME', '07:00'),
        'absen_reminder_delay' => env('WA_ABSEN_REMINDER_DELAY', 30),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
    ],

];
